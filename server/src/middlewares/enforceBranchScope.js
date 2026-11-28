import { ApiError } from './errorHandler.js';
import {
    BRANCH_SCOPED_ROLES,
    OWNERSHIP_SCOPED_ROLES,
    getBranchScope,
} from '../utils/branchAccess.js';

const BRANCH_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function isIgnoredBranchValue(value) {
    return value === undefined || value === null || value === '';
}

function parseScalarBranchId(value) {
    if (typeof value === 'string') {
        return BRANCH_ID_PATTERN.test(value) ? value : null;
    }

    if (typeof value === 'number') {
        return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
    }

    return null;
}

/**
 * Branch Isolation middleware (FR-AUTH-04).
 *
 * - ADMIN          → req.branchScope = null (unrestricted)
 * - BRANCH_MANAGER → req.branchScope = assigned branch IDs (403 if none)
 * - SECRETARY      → req.branchScope = assigned branch IDs (403 if none)
 * - INSTRUCTOR     → req.branchScope = [] and ownership scope marker
 * - STUDENT        → req.branchScope = [] and ownership scope marker
 *
 * Explicit branchId values supplied across params, query, and body are all
 * validated independently against type/format, resolved scope, and consistency;
 * services must additionally use applyBranchFilter().
 */
export function enforceBranchScope(req, _res, next) {
    if (!req.user) {
        return next(new ApiError(401, 'يجب تسجيل الدخول أولاً', 'UNAUTHORIZED'));
    }

    const rawScope = getBranchScope(req.user);
    const scope =
        rawScope === null ? null : rawScope.filter((id) => parseScalarBranchId(id) !== null);

    req.branchScope = scope;
    req.ownershipScope = OWNERSHIP_SCOPED_ROLES.includes(req.user.role) ? req.user.role : null;

    // Collect branchId values from every request source; ignore only undefined, null, and ''.
    const candidates = [req.params?.branchId, req.query?.branchId, req.body?.branchId];
    const supplied = candidates.filter((value) => !isIgnoredBranchValue(value));

    // Validate every supplied value is a valid scalar identifier (reject arrays, objects, malformed).
    const requestedBranchIds = [];
    for (const value of supplied) {
        const parsed = parseScalarBranchId(value);
        if (!parsed) {
            return next(new ApiError(400, 'قيمة معرف الفرع غير صالحة', 'INVALID_BRANCH_ID'));
        }
        requestedBranchIds.push(parsed);
    }

    // Fail closed when a branch-scoped role has no assigned branches.
    if (BRANCH_SCOPED_ROLES.includes(req.user.role) && scope.length === 0) {
        return next(new ApiError(403, 'لم يتم تعيين فرع لهذا الحساب', 'NO_BRANCH_ASSIGNED'));
    }

    // For non-ADMIN roles, verify EVERY supplied branchId belongs to req.branchScope.
    // Run before conflict detection so smuggling an unauthorized ID alongside an authorized
    // one fails with 403 BRANCH_FORBIDDEN rather than 400.
    if (scope !== null) {
        const hasUnauthorizedBranch = requestedBranchIds.some(
            (branchId) => !scope.includes(branchId),
        );
        if (hasUnauthorizedBranch) {
            return next(new ApiError(403, 'لا يمكنك الوصول لبيانات هذا الفرع', 'BRANCH_FORBIDDEN'));
        }
    }

    // Reject conflicting branchId values across request sources rather than silently picking one.
    const uniqueBranchIds = [...new Set(requestedBranchIds)];
    if (uniqueBranchIds.length > 1) {
        return next(new ApiError(400, 'قيم معرف الفرع في الطلب متضاربة', 'CONFLICTING_BRANCH_IDS'));
    }

    return next();
}
