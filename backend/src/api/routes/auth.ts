import { Router } from 'express';
import * as authController from '../controllers/authController';
import { validate } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimiter';
import { registerSchema, loginSchema, verify2FASchema } from '../../utils/validation';

const router = Router();

router.post('/register', rateLimit(3, 3600), validate(registerSchema), authController.registerUser);

router.post('/login', rateLimit(5, 900), validate(loginSchema), authController.loginUser);

router.post('/refresh', rateLimit(10, 900), authController.refreshToken);

router.post('/logout', authMiddleware, authController.logoutUser);

router.post('/2fa/setup', authMiddleware, authController.setup2FA);

router.post('/2fa/verify', authMiddleware, validate(verify2FASchema), authController.verify2FASetup);

router.post('/2fa/login', rateLimit(5, 900), authController.verify2FALogin);

export default router;

