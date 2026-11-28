import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { loginRateLimiter, refreshRateLimiter } from '../middlewares/rateLimiter.js';
import { validate } from '../middlewares/validate.js';
import { verifyTrustedOriginForCookie } from '../middlewares/verifyTrustedOrigin.js';
import { loginSchema } from '../validators/auth.validator.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

// Member 1 (Ezzat) — FR-AUTH-01, FR-AUTH-02, FR-AUTH-03, FR-AUTH-07
// Global verifyTrustedOrigin already runs; origin is checked when headers are present.
router.post('/login', loginRateLimiter, validate({ body: loginSchema }), authController.login);

// Cookie-authenticated: origin is required when both Origin and Referer are absent.
router.post('/refresh', verifyTrustedOriginForCookie, refreshRateLimiter, authController.refresh);

// Logout is cookie-based so it still works after the access token expires.
router.post('/logout', verifyTrustedOriginForCookie, authController.logout);

router.post('/logout-all', authenticate, authController.logoutAll);

router.get('/me', authenticate, authController.me);

export default router;
