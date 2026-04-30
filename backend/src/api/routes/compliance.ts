import { Router } from 'express';
import * as kycController from '../controllers/kycController';
import { authMiddleware } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

router.get('/kyc-queue', authMiddleware, authorize('compliance_officer', 'admin'),
kycController.approveKYC
);

router.post('/kyc/:id/approve', authMiddleware, authorize('compliance_officer', 'admin'),
kycController.approveKYC
);

router.post('/kyc/:id/reject', authMiddleware, authorize('compliance_officer', 'admin'),
kycController.rejectKYC);

export default router;
