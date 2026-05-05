import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as settlementController from '../controllers/settlementController';

const router = Router();


router.use(authMiddleware);
router.use(authorize('admin'));

// POST /api/settlements/run — trigger settlement
router.post('/run', settlementController.runSettlement);

// PATCH /api/settlements/:id/complete — mark as completed
router.patch('/:id/complete', settlementController.completeSettlement);

// GET /api/settlements — view history
router.get('/', settlementController.getHistory);

// GET /api/settlements/:id — view single settlement
router.get('/:id', settlementController.getById);

export default router;