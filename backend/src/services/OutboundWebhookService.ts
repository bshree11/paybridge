// PURPOSE: Sends HMAC-signed webhooks to merchants when events happen
// Retries up to 3 times if merchant server is down

import crypto from 'crypto';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

//Types

export interface WebhookPayload {
  event: string;           // e.g. "payment.confirmed", "payment.failed"
  transactionId: string;
  amount: number;
  currency: string;
  status: string;
  timestamp: string;       // ISO timestamp
  data?: Record<string, any>;  // any extra data
}

export interface WebhookDelivery {
  id: string;
  merchantId: string;
  url: string;
  event: string;
  payload: WebhookPayload;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  lastAttemptAt: Date;
  responseStatus?: number;
  createdAt: Date;
}


//CONFIG

const MAX_RETRIES = 3;
const RETRY_DELAYS = [30000, 60000, 120000]; // 30s, 60s, 2min


//FUNCTIONS


/**
 * SEND WEBHOOK TO MERCHANT
 * Creates a signed webhook and sends it to the merchant's URL
 * Saves delivery record to database for tracking
 */
export async function sendWebhook(
  merchantId: string,
  event: string,
  transactionId: string,
  amount: number,
  currency: string,
  status: string,
  extraData?: Record<string, any>
): Promise<void> {
  // Step 1: Get merchant's webhook URL and secret from database
  const merchantResult = await pool.query(
    `SELECT webhook_url, webhook_secret FROM merchants WHERE id = $1`,
    [merchantId]
  );

  if (merchantResult.rows.length === 0) {
    logger.warn('Merchant not found for webhook', { merchantId });
    return;
  }

  const { webhook_url, webhook_secret } = merchantResult.rows[0];

  // No webhook URL configured? Skip silently
  if (!webhook_url) {
    logger.info('No webhook URL configured for merchant', { merchantId });
    return;
  }

  // Step 2: Build the payload
  const payload: WebhookPayload = {
    event,
    transactionId,
    amount,
    currency,
    status,
    timestamp: new Date().toISOString(),
    data: extraData,
  };

  // Step 3: Save delivery record to database (for tracking/debugging)
  const deliveryResult = await pool.query(
    `INSERT INTO outbound_webhooks 
     (merchant_id, url, event, payload, status, attempts)
     VALUES ($1, $2, $3, $4, 'pending', 0)
     RETURNING id`,
    [merchantId, webhook_url, event, JSON.stringify(payload)]
  );

  const deliveryId = deliveryResult.rows[0].id;

  // Step 4: Send it (with retries)
  await deliverWebhook(deliveryId, webhook_url, webhook_secret, payload);
}

/**
 * DELIVER WEBHOOK WITH RETRIES
 * Tries up to 3 times with increasing delays
 */
async function deliverWebhook(
  deliveryId: string,
  url: string,
  secret: string,
  payload: WebhookPayload
): Promise<void> {
  const payloadString = JSON.stringify(payload);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Generate HMAC signature
      const signature = generateSignature(payloadString, secret);

      // Send the webhook
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PayBridge-Signature': signature,
          'X-PayBridge-Event': payload.event,
          'X-PayBridge-Timestamp': payload.timestamp,
          'X-PayBridge-Delivery': deliveryId,
        },
        body: payloadString,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      // Update delivery record
      await pool.query(
        `UPDATE outbound_webhooks 
         SET status = $1, 
             attempts = $2, 
             response_status = $3,
             last_attempt_at = NOW(),
             updated_at = NOW()
         WHERE id = $4`,
        [
          response.ok ? 'delivered' : 'failed',
          attempt,
          response.status,
          deliveryId,
        ]
      );

      if (response.ok) {
        logger.info('Webhook delivered successfully', {
          deliveryId,
          url,
          event: payload.event,
          attempt,
        });
        return; // Success! Stop retrying
      }

      logger.warn('Webhook delivery got non-OK response', {
        deliveryId,
        status: response.status,
        attempt,
      });

    } catch (error: any) {
      logger.warn('Webhook delivery attempt failed', {
        deliveryId,
        attempt,
        error: error.message,
      });

      // Update attempt count
      await pool.query(
        `UPDATE outbound_webhooks 
         SET attempts = $1, 
             last_attempt_at = NOW(),
             updated_at = NOW()
         WHERE id = $2`,
        [attempt, deliveryId]
      );
    }

    // Wait before retrying (30s, 60s, 2min)
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_DELAYS[attempt - 1];
      logger.info(`Waiting ${delay / 1000}s before retry`, { deliveryId });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All retries failed
  await pool.query(
    `UPDATE outbound_webhooks 
     SET status = 'failed', updated_at = NOW()
     WHERE id = $1`,
    [deliveryId]
  );

  logger.error('Webhook delivery failed after all retries', {
    deliveryId,
    url,
    event: payload.event,
  });
}

/**
 * GENERATE HMAC SIGNATURE
 * Creates a signature the merchant can verify
 */
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * GET WEBHOOK DELIVERY HISTORY
 * For merchants to check if webhooks were delivered
 */
export async function getDeliveryHistory(
  merchantId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ deliveries: WebhookDelivery[]; total: number }> {
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM outbound_webhooks WHERE merchant_id = $1`,
    [merchantId]
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const result = await pool.query(
    `SELECT * FROM outbound_webhooks 
     WHERE merchant_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2 OFFSET $3`,
    [merchantId, limit, offset]
  );

  return {
    deliveries: result.rows.map(row => ({
      id: row.id,
      merchantId: row.merchant_id,
      url: row.url,
      event: row.event,
      payload: row.payload,
      status: row.status,
      attempts: row.attempts,
      lastAttemptAt: row.last_attempt_at,
      responseStatus: row.response_status,
      createdAt: row.created_at,
    })),
    total,
  };
}

/**
 * RETRY FAILED WEBHOOK
 * Manually retry a failed webhook delivery
 */
export async function retryWebhook(deliveryId: string): Promise<void> {
  const result = await pool.query(
    `SELECT ow.*, m.webhook_secret 
     FROM outbound_webhooks ow
     JOIN merchants m ON m.id = ow.merchant_id
     WHERE ow.id = $1`,
    [deliveryId]
  );

  if (result.rows.length === 0) {
    throw new Error('Webhook delivery not found');
  }

  const row = result.rows[0];

  await deliverWebhook(
    deliveryId,
    row.url,
    row.webhook_secret,
    row.payload
  );
}