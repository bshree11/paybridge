import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as gdprController from '../controllers/gdprController';

const router = Router();

router.use(authMiddleware);

// GET /api/gdpr/export — download all my data
router.get('/export', gdprController.exportData);

// DELETE /api/gdpr/account — delete my account
router.delete('/account', gdprController.deleteAccount);

// GET /api/gdpr/consent — check my consent status
router.get('/consent', gdprController.getConsent);

// PATCH /api/gdpr/consent — update my consent preferences
router.patch('/consent', gdprController.updateConsent);

export default router;