// PURPOSE: SAR endpoints - only accessible by compliance officers and admins

import { Router } from 'express';
import sarController from '../controllers/sarControllers';
import { authMiddleware } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

// All SAR routes need authentication + compliance_officer or admin role
router.use(authMiddleware);
router.use(authorize('compliance_officer', 'admin'));

// GET /api/sar - List all SARs (with filters)
router.get('/', sarController.list);

// GET /api/sar/:id - Get single SAR
router.get('/:id', sarController.getById);

// POST /api/sar - Manually create SAR
router.post('/', sarController.create);

// PATCH /api/sar/:id/status - Update status
router.patch('/:id/status', sarController.updateStatus);

// POST /api/sar/:id/notes - Add note
router.post('/:id/notes', sarController.addNote);

// PATCH /api/sar/:id/assign - Assign to officer
router.patch('/:id/assign', sarController.assign);

export default router;