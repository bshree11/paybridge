import Stripe from 'stripe';
import { env } from '../config/environment';
import { PaymentProcessor, ProcessorResult } from './BaseProcessor';
import { logger } from '../utils/logger';

//cardToken = before payment. Represents the customer's card. frontend gets this from stripe when user enters card details.

//chargeId = after paymennt, the receipt stripe gives us after a successful charge. used to refund later if anything goes wrong.

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export const stripeProcessor: PaymentProcessor ={
    name: 'stripe',

    async charge(
        amount: number,
        currency: string,
        cardToken: string

    ): Promise<ProcessorResult>{
        try{
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(amount * 100),
                currency: currency.toLowerCase(),
                payment_method: cardToken,
                confirm: true,
                automatic_payment_methods: {
                    enabled: true,
                    allow_redirects: 'never',
                },
            });

            logger.info('Stripe charge successful', {
                chargeId: paymentIntent.id,  
            });

            return {
                success: true,
                chargeId: paymentIntent.id,
                status: paymentIntent.status,
            };
        }catch (error: any){
            logger.error('Stripe charge failed', {
                error: error.message,
            });

            return{
                success: false,
                chargeId: '',
                status: 'failed',
                error: error.message,
            };
        }
    },

    async refund(
        chargeId: string
    ): Promise<ProcessorResult> {
        try{
            const refund = await stripe.refunds.create({
                payment_intent: chargeId,
            });

            return{
                success: true,
                chargeId: refund.id,
                status: refund.status || 'succeeded',
            };
        }catch(error: any){
            return{

                success: false,
                chargeId: '',
                status: 'failed',
                error: error.message,
            };

        }
    },
};