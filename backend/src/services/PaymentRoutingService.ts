// PURPOSE: Routes payments to the right processor based on currency

// GBP/USD/EUR → Stripe, INR → Razorpay
// Falls back to alternative processor if primary fails

import { PaymentProcessor, ProcessorResult } from '../processors/BaseProcessor';
import { stripeProcessor } from '../processors/StripeProcessor';
import { razorpayProcessor } from '../processors/RazorpayProcessor';
import { logger } from '../utils/logger';

// Types 

export interface RoutingResult {
  processor: string;         // which processor was used
  result: ProcessorResult;   // the charge/refund result
  wasFailover: boolean;      // did we fall back to a backup?
}

// Config 

// Which processor handles which currencies
const CURRENCY_ROUTING: Record<string, string> = {
  GBP: 'stripe',
  USD: 'stripe',
  EUR: 'stripe',
  INR: 'razorpay',
};

// Fallback: if primary fails, try this one
const FAILOVER_MAP: Record<string, string> = {
  stripe: 'razorpay',
  razorpay: 'stripe',
};

// Map processor names to actual processor objects
const PROCESSORS: Record<string, PaymentProcessor> = {
  stripe: stripeProcessor,
  razorpay: razorpayProcessor,
};

// Functions 

/**
 * ROUTE PAYMENT
 * Picks the right processor based on currency, tries it,
 * and falls back to backup if it fails
 */
export async function routePayment(
  amount: number,
  currency: string,
  cardToken: string
): Promise<RoutingResult> {
  // Step 1: Pick the right processor for this currency
  const primaryName = CURRENCY_ROUTING[currency];

  if (!primaryName) {
    throw new Error(`No processor configured for currency: ${currency}`);
  }

  const primaryProcessor = PROCESSORS[primaryName];

  logger.info('Routing payment', {
    currency,
    amount,
    processor: primaryName,
  });

  // Step 2: Try the primary processor
  try {
    const result = await primaryProcessor.charge(amount, currency, cardToken);

    if (result.success) {
      logger.info('Payment routed successfully', {
        processor: primaryName,
        chargeId: result.chargeId,
      });

      return {
        processor: primaryName,
        result,
        wasFailover: false,
      };
    }

    // Primary returned success: false — try failover
    logger.warn('Primary processor failed, attempting failover', {
      primary: primaryName,
      error: result.error,
    });

  } catch (error: any) {
    logger.warn('Primary processor threw error, attempting failover', {
      primary: primaryName,
      error: error.message,
    });
  }

  // Step 3: Try the fallback processor
  const failoverName = FAILOVER_MAP[primaryName];

  if (!failoverName) {
    throw new Error(`Payment failed and no failover available for ${primaryName}`);
  }

  const failoverProcessor = PROCESSORS[failoverName];

  logger.info('Trying failover processor', {
    failover: failoverName,
    currency,
    amount,
  });

  try {
    const result = await failoverProcessor.charge(amount, currency, cardToken);

    if (result.success) {
      logger.info('Failover payment succeeded', {
        processor: failoverName,
        chargeId: result.chargeId,
      });

      return {
        processor: failoverName,
        result,
        wasFailover: true,
      };
    }

    // Both failed
    throw new Error(result.error || 'Both processors failed');

  } catch (error: any) {
    logger.error('Both processors failed', {
      primary: primaryName,
      failover: failoverName,
      error: error.message,
    });

    throw new Error(`Payment failed on both ${primaryName} and ${failoverName}: ${error.message}`);
  }
}

/**
 * ROUTE REFUND
 * Refunds must go through the SAME processor that charged
 * (you can't refund a Stripe charge through Razorpay)
 */
export async function routeRefund(
  chargeId: string,
  processorName: string
): Promise<RoutingResult> {
  const processor = PROCESSORS[processorName];

  if (!processor) {
    throw new Error(`Unknown processor: ${processorName}`);
  }

  logger.info('Routing refund', {
    processor: processorName,
    chargeId,
  });

  const result = await processor.refund(chargeId);

  return {
    processor: processorName,
    result,
    wasFailover: false,
  };
}

/**
 * GET PROCESSOR FOR CURRENCY
 * Returns which processor would handle a given currency
 * Useful for the frontend to show "Powered by Stripe" or "Powered by Razorpay"
 */
export function getProcessorForCurrency(currency: string): string {
  return CURRENCY_ROUTING[currency] || 'stripe';
}

/**
 * GET SUPPORTED CURRENCIES
 * Returns all currencies we can process
 */
export function getSupportedCurrencies(): string[] {
  return Object.keys(CURRENCY_ROUTING);
}