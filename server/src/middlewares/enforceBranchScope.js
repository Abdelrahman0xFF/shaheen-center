import { ApiError } from './errorHandler.js';

/**
 * Branch Isolation middleware (FR-AUTH-04).
 * - ADMIN: req.branchScope = null (unrestricted access to all branches)
 * - BRANCH_MANAGER / SECRETARY: req.branchScope = req.user.branchIds (must have at least 1 branch)
 *   Also rejects explicit branchId in params/query/body outside their assigned branches.
 */
export function enforceBranchScope(req, _res, next) {
    if (!req.user) {
        return next(new ApiError(401, 'يجب تسجيل الدخول أولاً', 'UNAUTHORIZED'));
    }

    if (req.user.role === 'ADMIN') {
        req.branchScope = null;
        return next();
    }

    if (req.user.role === 'BRANCH_MANAGER' || req.user.role === 'SECRETARY') {
        const allowed = req.user.branchIds || [];
        if (allowed.length === 0) {
            return next(new ApiError(403, 'لم يتم تعيين فرع لهذا الحساب', 'NO_BRANCH_ASSIGNED'));
        }

        const requestedBranchId = req.params.branchId || req.query.branchId || req.body?.branchId;
        if (requestedBranchId && !allowed.includes(requestedBranchId)) {
            return next(new ApiError(403, 'لا يمكنك الوصول لبيانات هذا الفرع', 'BRANCH_FORBIDDEN'));
        }

        req.branchScope = allowed;
        return next();
    }

    req.branchScope = null;
    return next();
}
