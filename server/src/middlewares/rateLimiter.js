import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * Rate-limiter factory so tests and future endpoints can create isolated
 * instances without sharing counters.
 */
export function createRateLimiter({ windowMs, max, code, message }) {
    return rateLimit({
        windowMs,
        limit: max,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: {
            success: false,
            error: {
                code: code || 'TOO_MANY_REQUESTS',
                message: message || 'تم تجاوز عدد المحاولات، يرجى المحاولة لاحقاً',
            },
        },
    });
}

/**
 * Login rate limiter (FR-AUTH-07, NFR-SEC-07). Keyed by client IP.
 */
export const loginRateLimiter = createRateLimiter({
    windowMs: env.loginRateLimitWindowMs,
    max: env.loginRateLimitMax,
    code: 'TOO_MANY_REQUESTS',
    message: 'تم تجاوز عدد محاولات تسجيل الدخول، يرجى المحاولة لاحقاً',
});

/**
 * Refresh rate limiter. Generous enough for normal rotation, strict enough to
 * slow down token-guessing attempts.
 */
export const refreshRateLimiter = createRateLimiter({
    windowMs: env.refreshRateLimitWindowMs,
    max: env.refreshRateLimitMax,
    code: 'TOO_MANY_REQUESTS',
    message: 'تم تجاوز عدد محاولات تحديث الجلسة، يرجى المحاولة لاحقاً',
});

/**
 * QR scan rate limiter (NFR-SEC-07).
 * Generous for rapid door queues while preventing abuse.
 */
export const scanRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 120,
    code: 'TOO_MANY_REQUESTS',
    message: 'عدد عمليات المسح مرتفع جداً، انتظر لحظة',
});
