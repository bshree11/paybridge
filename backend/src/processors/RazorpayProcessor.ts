// PURPOSE: Handles INR payments through Razorpay
// Follows same BaseProcessor interface as StripeProcessor

import { PaymentProcessor, ProcessorResult } from './BaseProcessor';
import { logger } from '../utils/logger';
import { env } from '../config/environment';

// Razorpay SDK
import Razorpay from 'razorpay';

// Create Razorpay instance
const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

export const razorpayProcessor: PaymentProcessor = {
  name: 'razorpay',

  /**
   * CHARGE — create a Razorpay order and capture payment
   * 
   * How Razorpay works (different from Stripe):
   * Step 1: Create an "order" on backend (this function)
   * Step 2: Frontend shows Razorpay checkout popup
   * Step 3: Customer pays in the popup
   * Step 4: Razorpay sends webhook confirming payment
   * 
   * For now we create the order here. Frontend handles step 2-3.
   */
  async charge(
    amount: number,
    currency: string,
    cardToken: string
  ): Promise<ProcessorResult> {
    try {
      // Razorpay expects amount in smallest unit (paise for INR)
      // £1 = 100 pence, ₹1 = 100 paise
      const amountInPaise = Math.round(amount * 100);

      // Create Razorpay order
      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: currency,
        receipt: `receipt_${Date.now()}`,
        notes: {
          source: 'paybridge',
        },
      });

      logger.info('Razorpay order created', {
        orderId: order.id,
        amount: amountInPaise,
        currency,
      });

      return {
        success: true,
        chargeId: order.id,
        status: 'pending',  // becomes 'confirmed' after webhook
      };

    } catch (error: any) {
      logger.error('Razorpay charge failed', {
        error: error.message,
        amount,
        currency,
      });

      return {
        success: false,
        chargeId: '',
        status: 'failed',
        error: error.message || 'Razorpay charge failed',
      };
    }
  },

    /**
   * REFUND — refund a Razorpay payment
   * chargeId here is the Razorpay payment_id (not order_id)
   */
  async refund(chargeId: string): Promise<ProcessorResult> {
    try {
      const refund = await razorpay.payments.refund(chargeId, {
        speed: 'normal',  // 'normal' = 5-7 days, 'optimum' = instant
      });

      logger.info('Razorpay refund created', {
        refundId: refund.id,
        paymentId: chargeId,
      });

      return {
        success: true,
        chargeId: refund.id,
        status: 'refunded',
      };

    } catch (error: any) {
      logger.error('Razorpay refund failed', {
        error: error.message,
        chargeId,
      });

      return {
        success: false,
        chargeId: '',
        status: 'failed',
        error: error.message || 'Razorpay refund failed',
      };
    }
  },
};
