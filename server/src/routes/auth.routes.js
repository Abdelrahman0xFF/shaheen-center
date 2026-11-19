import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { loginRateLimiter } from '../middlewares/rateLimiter.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

// Member 1 (Ezzat) — FR-AUTH-01, FR-AUTH-02, FR-AUTH-07
router.post('/login', loginRateLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
