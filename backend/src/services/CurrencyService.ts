// PURPOSE: Currency conversion with live rates, caching, and conversion fees

import { redis } from "../config/redis";
import { pool } from "../config/database";
import { logger } from "../utils/logger";

// --- Types ---

export interface ConversionResult {
  fromCurrency: string;
  toCurrency: string;
  originalAmount: number;
  convertedAmount: number;
  rate: number;
  fee: number;
  feePercentage: number;
  totalCharged: number; // originalAmount + fee
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  fetchedAt: Date;
}

// --- Config ---

const CONVERSION_FEE_PERCENT = 1.5; // 1.5% fee on every conversion
const CACHE_TTL = 3600; // Cache rates for 1 hour (3600 seconds)
const API_BASE_URL = "https://api.exchangerate-api.com/v4/latest";

// Fallback rates in case API is down
const FALLBACK_RATES: Record<string, Record<string, number>> = {
  GBP: { USD: 1.36, EUR: 1.16, INR: 128.78 },
  USD: { GBP: 0.74, EUR: 0.85, INR: 94.35 },
  EUR: { GBP: 0.86, USD: 1.17, INR: 110.4 },
  INR: { GBP: 0.0078, USD: 0.0106, EUR: 0.0091 },
};

// Supported currencies
const SUPPORTED_CURRENCIES = ["GBP", "USD", "EUR", "INR"];

// --- Functions ---

/**
 * CONVERT CURRENCY
 * The main function — converts an amount from one currency to another
 * Adds conversion fee automatically
 *
 * Example: convert(100, 'USD', 'GBP')
 * → Gets rate (0.79), calculates fee (1.5%), returns result
 */
export async function convert(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): Promise<ConversionResult> {
  // Same currency? No conversion needed
  if (fromCurrency === toCurrency) {
    return {
      fromCurrency,
      toCurrency,
      originalAmount: amount,
      convertedAmount: amount,
      rate: 1,
      fee: 0,
      feePercentage: 0,
      totalCharged: amount,
    };
  }

  // Validate currencies
  if (!SUPPORTED_CURRENCIES.includes(fromCurrency)) {
    throw new Error(`Unsupported currency: ${fromCurrency}`);
  }
  if (!SUPPORTED_CURRENCIES.includes(toCurrency)) {
    throw new Error(`Unsupported currency: ${toCurrency}`);
  }

  // Get the exchange rate
  const rate = await getRate(fromCurrency, toCurrency);

  // Calculate conversion
  const convertedAmount = amount * rate;

  // Calculate fee (1.5% of original amount)
  const fee = amount * (CONVERSION_FEE_PERCENT / 100);

  // Round to 2 decimal places
  const roundedConverted = Math.round(convertedAmount * 100) / 100;
  const roundedFee = Math.round(fee * 100) / 100;

  const result: ConversionResult = {
    fromCurrency,
    toCurrency,
    originalAmount: amount,
    convertedAmount: roundedConverted,
    rate,
    fee: roundedFee,
    feePercentage: CONVERSION_FEE_PERCENT,
    totalCharged: amount + roundedFee,
  };

  logger.info("Currency conversion", {
    from: fromCurrency,
    to: toCurrency,
    amount,
    convertedAmount: roundedConverted,
    rate,
    fee: roundedFee,
  });

  return result;
}

/**
 * GET EXCHANGE RATE
 * First checks Redis cache → then database → then API → then fallback
 */
export async function getRate(
  fromCurrency: string,
  toCurrency: string,
): Promise<number> {
  // Step 1: Check Redis cache
  try {
    const cacheKey = `exchange_rate:${fromCurrency}:${toCurrency}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return parseFloat(cached);
    }
  } catch (error) {
    logger.warn("Redis rate cache miss", { fromCurrency, toCurrency });
  }

  // Step 2: Check database
  try {
    const dbResult = await pool.query(
      `SELECT rate FROM currency_rates 
 WHERE base_currency = $1 AND target_currency = $2
       AND fetched_at > NOW() - INTERVAL '2 hours'
       ORDER BY fetched_at DESC LIMIT 1`,
      [fromCurrency, toCurrency],
    );

    if (dbResult.rows.length > 0) {
      const rate = parseFloat(dbResult.rows[0].rate);
      // Re-cache in Redis
      await cacheRate(fromCurrency, toCurrency, rate);
      return rate;
    }
  } catch (error) {
    logger.warn("Database rate lookup failed", { error });
  }

  // Step 3: Fetch from API
  try {
    const rate = await fetchRateFromAPI(fromCurrency, toCurrency);
    if (rate) {
      await saveRate(fromCurrency, toCurrency, rate);
      await cacheRate(fromCurrency, toCurrency, rate);
      return rate;
    }
  } catch (error) {
    logger.warn("API rate fetch failed, using fallback", { error });
  }

  // Step 4: Use fallback rates
  const fallbackRate = FALLBACK_RATES[fromCurrency]?.[toCurrency];
  if (fallbackRate) {
    return fallbackRate;
  }

  throw new Error(
    `No exchange rate available for ${fromCurrency} → ${toCurrency}`,
  );
}

/**
 * FETCH RATE FROM EXTERNAL API
 * Uses free exchangerate-api.com
 */
async function fetchRateFromAPI(
  fromCurrency: string,
  toCurrency: string,
): Promise<number | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/${fromCurrency}`);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = (await response.json()) as { rates: Record<string, number> };
    const rate = data.rates?.[toCurrency];

    if (!rate) {
      throw new Error(`Rate not found for ${toCurrency}`);
    }

    return rate;
  } catch (error) {
    logger.error("Exchange rate API error", {
      error,
      fromCurrency,
      toCurrency,
    });
    return null;
  }
}

/**
 * REFRESH ALL RATES
 * Called by the cron job every hour
 * Fetches rates for all supported currency pairs
 */
export async function refreshAllRates(): Promise<void> {
  logger.info("Refreshing all exchange rates...");

  for (const from of SUPPORTED_CURRENCIES) {
    try {
      const response = await fetch(`${API_BASE_URL}/${from}`);

      if (!response.ok) continue;

      const data = (await response.json()) as { rates: Record<string, number> };
      for (const to of SUPPORTED_CURRENCIES) {
        if (from === to) continue;

        const rate = data.rates?.[to];
        if (rate) {
          await saveRate(from, to, rate);
          await cacheRate(from, to, rate);
        }
      }

      // Small delay between API calls to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      logger.error(`Failed to refresh rates for ${from}`, { error });
    }
  }

  logger.info("Exchange rates refreshed");
}

/**
 * GET ALL CURRENT RATES
 * Returns all cached rates (for the frontend to display)
 */
export async function getAllRates(): Promise<ExchangeRate[]> {
  const result = await pool.query(
    `SELECT DISTINCT ON (base_currency, target_currency) 
 base_currency, target_currency, rate, fetched_at
     FROM currency_rates 
     ORDER BY from_currency, to_currency, fetched_at DESC`,
  );

 return result.rows.map(row => ({
  from: row.base_currency,
  to: row.target_currency,
    rate: parseFloat(row.rate),
    fetchedAt: row.fetched_at,
  }));
}

/**
 * GET SUPPORTED CURRENCIES LIST
 */
export function getSupportedCurrencies(): string[] {
  return [...SUPPORTED_CURRENCIES];
}

// --- Helper Functions ---

/**
 * Save rate to database (permanent storage)
 */
async function saveRate(
  fromCurrency: string,
  toCurrency: string,
  rate: number,
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO currency_rates (base_currency, target_currency, rate, fetched_at)
       VALUES ($1, $2, $3, NOW())`,
      [fromCurrency, toCurrency, rate],
    );
  } catch (error) {
    logger.error("Failed to save rate to database", { error });
  }
}

/**
 * Cache rate in Redis (fast access, 1 hour expiry)
 */
async function cacheRate(
  fromCurrency: string,
  toCurrency: string,
  rate: number,
): Promise<void> {
  try {
    const key = `exchange_rate:${fromCurrency}:${toCurrency}`;
    await redis.setex(key, CACHE_TTL, String(rate));
  } catch (error) {
    logger.warn("Failed to cache rate in Redis", { error });
  }
}
