import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as disputeController from '../controllers/disputeController';

const router = Router();

router.use(authMiddleware);

// Customer routes
router.post('/', disputeController.raise);
router.get('/my', disputeController.getUserDisputes);
router.get('/:id', disputeController.getById);

// Merchant route
router.patch('/:id/respond', disputeController.merchantRespond);

// Compliance officer routes
router.get('/', authorize('compliance_officer', 'admin'), disputeController.getAllDisputes);
router.patch('/:id/refund', authorize('compliance_officer', 'admin'), disputeController.resolveRefund);
router.patch('/:id/reject', authorize('compliance_officer', 'admin'), disputeController.resolveReject);

export default router;