import { ApiError } from './errorHandler.js';

/**
 * RBAC middleware (FR-AUTH-02, FR-AUTH-03).
 * Usage: router.get('/', authenticate, authorizeRoles('ADMIN'), handler)
 */
export function authorizeRoles(...allowedRoles) {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new ApiError(401, 'يجب تسجيل الدخول أولاً', 'UNAUTHORIZED'));
        }

        if (!req.user.isActive) {
            return next(new ApiError(401, 'الحساب غير موجود أو غير نشط', 'ACCOUNT_INACTIVE'));
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(new ApiError(403, 'ليس لديك صلاحية تنفيذ هذا الإجراء', 'FORBIDDEN'));
        }

        return next();
    };
}
