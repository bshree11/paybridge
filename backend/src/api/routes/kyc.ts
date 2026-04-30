import { Router } from 'express';
import * as kycController from '../controllers/kycController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/submit', authMiddleware, kycController.submitKYC);
router.get('/status', authMiddleware, kycController.getStatus);

export default router;