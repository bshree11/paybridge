// PURPOSE: Webhook endpoints for Stripe and Razorpay - they call in this endpoint to paybridge
// NO authentication — these are called by external services
// Security comes from signature verification instead


import { Router } from 'express';
import { handleStripeWebhook, handleRazorpayWebhook } from '../controllers/webhookController';

const router = Router();

// POST /api/webhooks/stripe
router.post('/stripe', handleStripeWebhook);

// POST /api/webhooks/razorpay
router.post('/razorpay', handleRazorpayWebhook);

export default router;
