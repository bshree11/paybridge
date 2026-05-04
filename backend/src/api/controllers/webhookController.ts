// PURPOSE: Receives webhooks from Stripe and Razorpay
// Verifies signatures to make sure they're real
// Updates transaction status in our database

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { query } from '../../config/database';
import { logger } from '../../utils/logger';
import { logAudit } from '../../services/AuditLogger';
import { env } from '../../config/environment';

/**
 * STRIPE WEBHOOK HANDLER
 * Stripe calls this URL whesn payment status changes
 */
export async function handleStripeWebhook(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Step 1: Verify signature (is this really from Stripe?)
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      logger.warn('Stripe webhook missing signature');
      return res.status(400).json({ error: 'Missing signature' });
    }

    const isValid = verifyStripeSignature(
      JSON.stringify(req.body),
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );

    if (!isValid) {
      logger.warn('Stripe webhook invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Step 2: Process the event
    const event = req.body;

    logger.info('Stripe webhook received', {
      type: event.type,
      id: event.id,
    });

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(
          event.data.object.id,
          'stripe',
          event.data.object
        );
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(
          event.data.object.id,
          'stripe',
          event.data.object.last_payment_error?.message || 'Payment failed'
        );
        break;

      case 'charge.refunded':
        await handleRefundCompleted(
          event.data.object.id,
          'stripe'
        );
        break;

      default:
        logger.info('Unhandled Stripe event type', { type: event.type });
    }

    // Step 3: Always respond 200 (Stripe will retry if we don't)
    res.status(200).json({ received: true });

  } catch (error) {
    logger.error('Stripe webhook error', { error });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

/**
 * RAZORPAY WEBHOOK HANDLER
 * Razorpay calls this URL when payment status changes
 */
export async function handleRazorpayWebhook(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Step 1: Verify signature
    const signature = req.headers['x-razorpay-signature'] as string;

    if (!signature) {
      logger.warn('Razorpay webhook missing signature');
      return res.status(400).json({ error: 'Missing signature' });
    }

    const isValid = verifyRazorpaySignature(
      JSON.stringify(req.body),
      signature,
      env.RAZORPAY_WEBHOOK_SECRET
    );

    if (!isValid) {
      logger.warn('Razorpay webhook invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Step 2: Process the event
    const event = req.body;

    logger.info('Razorpay webhook received', {
      event: event.event,
    });

    switch (event.event) {
      case 'payment.captured':
        await handlePaymentSuccess(
          event.payload.payment.entity.order_id,
          'razorpay',
          event.payload.payment.entity
        );
        break;

      case 'payment.failed':
        await handlePaymentFailed(
          event.payload.payment.entity.order_id,
          'razorpay',
          event.payload.payment.entity.error_description || 'Payment failed'
        );
        break;

      case 'refund.processed':
        await handleRefundCompleted(
          event.payload.refund.entity.payment_id,
          'razorpay'
        );
        break;

      default:
        logger.info('Unhandled Razorpay event', { event: event.event });
    }

    res.status(200).json({ received: true });

  } catch (error) {
    logger.error('Razorpay webhook error', { error });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// ========================================
// SHARED HANDLERS (used by both Stripe and Razorpay)
// ========================================

/**
 * Payment succeeded — update transaction to 'confirmed'
 */
async function handlePaymentSuccess(
  processorChargeId: string,
  processor: string,
  paymentData: any
) {
  const result = await query(
    `UPDATE transactions 
     SET status = 'confirmed', 
         processor_charge_id = $1,
         updated_at = NOW()
     WHERE processor_charge_id = $1 OR 
           (processor = $2 AND status = 'pending')
     RETURNING id, user_id`,
    [processorChargeId, processor]
  );

  if (result.rows.length > 0) {
    const tx = result.rows[0];
    await logAudit(
      tx.user_id,
      'system',
      'payment_confirmed_webhook',
      'transaction',
      tx.id,
      { processor, processorChargeId },
      'webhook'
    );

    logger.info('Payment confirmed via webhook', {
      transactionId: tx.id,
      processor,
    });
  }
}

/**
 * Payment failed — update transaction to 'failed'
 */
async function handlePaymentFailed(
  processorChargeId: string,
  processor: string,
  errorMessage: string
) {
  const result = await query(
    `UPDATE transactions 
     SET status = 'failed',
         updated_at = NOW()
     WHERE processor_charge_id = $1 OR
           (processor = $2 AND status = 'pending')
     RETURNING id, user_id`,
    [processorChargeId, processor]
  );

  if (result.rows.length > 0) {
    const tx = result.rows[0];
    await logAudit(
      tx.user_id,
      'system',
      'payment_failed_webhook',
      'transaction',
      tx.id,
      { processor, error: errorMessage },
      'webhook'
    );

    logger.warn('Payment failed via webhook', {
      transactionId: tx.id,
      processor,
      error: errorMessage,
    });
  }
}

/**
 * Refund completed — update transaction to 'refunded'
 */
async function handleRefundCompleted(
  processorChargeId: string,
  processor: string
) {
  const result = await query(
    `UPDATE transactions 
     SET status = 'refunded',
         updated_at = NOW()
     WHERE processor_charge_id = $1
     RETURNING id, user_id`,
    [processorChargeId]
  );

  if (result.rows.length > 0) {
    const tx = result.rows[0];
    await logAudit(
      tx.user_id,
      'system',
      'refund_completed_webhook',
      'transaction',
      tx.id,
      { processor },
      'webhook'
    );

    logger.info('Refund confirmed via webhook', {
      transactionId: tx.id,
      processor,
    });
  }
}

// ========================================
// SIGNATURE VERIFICATION
// ========================================

/**
 * Verify Stripe webhook signature
 * Stripe uses HMAC SHA256 with a timestamp
 */
function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Stripe signature format: t=timestamp,v1=hash
    const parts = signature.split(',');
    const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
    const hash = parts.find(p => p.startsWith('v1='))?.split('=')[1];

    if (!timestamp || !hash) return false;

    // Recreate the signed payload
    const signedPayload = `${timestamp}.${payload}`;
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    // Compare (timing-safe to prevent timing attacks)
    return crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(expectedHash)
    );
  } catch {
    return false;
  }
}

/**
 * Verify Razorpay webhook signature
 * Razorpay uses simple HMAC SHA256
 */
function verifyRazorpaySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedHash)
    );
  } catch {
    return false;
  }
}