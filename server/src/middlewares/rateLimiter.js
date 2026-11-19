import rateLimit from 'express-rate-limit';

/**
 * Login rate limiter (FR-AUTH-07, NFR-SEC-07).
 */
export const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'تم تجاوز عدد محاولات تسجيل الدخول، يرجى المحاولة لاحقاً',
        },
    },
});

/**
 * QR scan rate limiter (NFR-SEC-07).
 * Generous for rapid door queues while preventing abuse.
 */
export const scanRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'عدد عمليات المسح مرتفع جداً، انتظر لحظة',
        },
    },
});
