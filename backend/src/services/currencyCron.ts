// PURPOSE: Background job that refreshes exchange rates every hour
// Runs automatically when the server starts

import { refreshAllRates } from './CurrencyService';
import { logger } from '../utils/logger';

let cronInterval: NodeJS.Timeout | null = null;

/**
 * START THE CRON JOB
 * Call this once when your server starts
 * It will refresh rates immediately, then every hour after that
 */
export function startCurrencyCron(): void {
  logger.info('Starting currency rate cron job (every 1 hour)');

  // Refresh immediately on startup
  refreshAllRates().catch(error => {
    logger.error('Initial rate refresh failed', { error });
  });

  // Then refresh every hour (3600000 milliseconds = 1 hour)
  cronInterval = setInterval(async () => {
    try {
      await refreshAllRates();
      logger.info('Scheduled rate refresh completed');
    } catch (error) {
      logger.error('Scheduled rate refresh failed', { error });
    }
  }, 3600000);

  logger.info('Currency cron job started');
}

/**
 * STOP THE CRON JOB
 * Call this when server shuts down (cleanup)
 */
export function stopCurrencyCron(): void {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    logger.info('Currency cron job stopped');
  }
}