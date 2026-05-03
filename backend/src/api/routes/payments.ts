import { Router } from 'express';
import * as paymentController from '../controllers/paymentController';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { rateLimit } from '../middleware/rateLimiter';
import { createPaymentSchema } from '../../utils/validation';

const router = Router();

router.post('/', authMiddleware, rateLimit(10,60), validate(createPaymentSchema), paymentController.createPayment);

router.get('/', authMiddleware, paymentController.getUserPayments);

router.get('/:id', authMiddleware, paymentController.getPayment);

export default router;