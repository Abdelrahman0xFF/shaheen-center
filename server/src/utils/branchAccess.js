import { ApiError } from '../middlewares/errorHandler.js';

export const BRANCH_SCOPED_ROLES = Object.freeze(['BRANCH_MANAGER', 'SECRETARY']);
export const OWNERSHIP_SCOPED_ROLES = Object.freeze(['INSTRUCTOR', 'STUDENT']);

// Resources that can be scoped by branch (directly or through relations).
export const SCOPED_RESOURCES = Object.freeze([
    'Branch',
    'Room',
    'Student',
    'Group',
    'Session',
    'Enrollment',
    'Attendance',
    'Payment',
]);

const OWNERSHIP_RESOURCES = Object.freeze([
    'Group',
    'Session',
    'Student',
    'Enrollment',
    'Attendance',
    'Payment',
]);

/**
 * Resolves the branch scope for a user (FR-AUTH-04).
 *
 * - ADMIN            → null (all branches)
 * - BRANCH_MANAGER   → assigned branch IDs
 * - SECRETARY        → assigned branch IDs
 * - INSTRUCTOR       → [] (no branch-wide access; services must apply ownership filters)
 * - STUDENT          → [] (no branch-wide access; services must apply ownership filters)
 */
export function getBranchScope(user) {
    if (!user) return [];

    if (user.role === 'ADMIN') return null;

    if (BRANCH_SCOPED_ROLES.includes(user.role)) {
        return [...new Set((user.branchIds || []).map(String))];
    }

    return [];
}

export function canAccessBranch(user, branchId) {
    const scope = getBranchScope(user);
    if (scope === null) return true;
    if (!branchId) return false;

    return scope.includes(String(branchId));
}

export function assertBranchAccess(user, branchId) {
    if (!canAccessBranch(user, branchId)) {
        throw new ApiError(403, 'لا يمكنك الوصول لبيانات هذا الفرع', 'BRANCH_FORBIDDEN');
    }

    return true;
}

/**
 * Adds the authorised branch filter to a Prisma `where` object.
 * The filter is always authoritative: a caller-supplied value for the same
 * field is overwritten, so the frontend can never widen its own scope.
 */
export function applyBranchFilter(user, where = {}, field = 'branchId') {
    const scope = getBranchScope(user);
    if (scope === null) return { ...where };

    return { ...where, [field]: { in: scope } };
}

// ---------------------------------------------------------------------------
// Ownership scope (INSTRUCTOR / STUDENT) — relation-aware (FR-AUTH-02)
// ---------------------------------------------------------------------------

/**
 * Returns the ownership scope for INSTRUCTOR/STUDENT roles, or null.
 * `instructorId` / `studentId` refer to the profile row id, and matching in
 * Prisma is done on `userId` (the owning user account id).
 */
export function getOwnershipScope(user) {
    if (!user) return null;

    if (user.role === 'INSTRUCTOR') {
        return {
            type: 'INSTRUCTOR',
            instructorId: user.instructorProfile?.id || user.instructorId || null,
            userId: user.id,
        };
    }

    if (user.role === 'STUDENT') {
        return {
            type: 'STUDENT',
            studentId: user.studentProfile?.id || user.studentId || null,
            userId: user.id,
        };
    }

    return null;
}

function ownershipClause(user, resource) {
    const scope = getOwnershipScope(user);
    if (!scope) return null;

    if (scope.type === 'INSTRUCTOR') {
        const instructorMatch = { instructor: { userId: scope.userId } };

        switch (resource) {
            case 'Group':
                return { course: instructorMatch };
            case 'Session':
                return { group: { course: instructorMatch } };
            case 'Student':
                return {
                    enrollments: {
                        some: {
                            status: 'ACTIVE',
                            group: { course: instructorMatch },
                        },
                    },
                };
            case 'Enrollment':
                return { group: { course: instructorMatch } };
            case 'Attendance':
                return { session: { group: { course: instructorMatch } } };
            case 'Payment':
                return { __deny__: true };
            default:
                return null;
        }
    }

    // STUDENT
    const studentMatch = { student: { userId: scope.userId } };

    switch (resource) {
        case 'Group':
            return {
                enrollments: {
                    some: { student: { userId: scope.userId }, status: 'ACTIVE' },
                },
            };
        case 'Session':
            return {
                group: {
                    enrollments: { some: { student: { userId: scope.userId } } },
                },
            };
        case 'Student':
            return { userId: scope.userId };
        case 'Enrollment':
            return { student: { userId: scope.userId } };
        case 'Attendance':
            return { student: { userId: scope.userId } };
        case 'Payment':
            return { student: { userId: scope.userId } };
        default:
            return null;
    }
}

/**
 * Applies a relation-aware ownership filter for INSTRUCTOR/STUDENT.
 * Throws 403 FORBIDDEN when an ownership-scoped role has no valid scope or
 * targets a resource it may not access. The clause is added under `AND` so a
 * caller-supplied `where` can never widen scope.
 */
export function applyOwnershipFilter(user, where = {}, resource) {
    if (!OWNERSHIP_RESOURCES.includes(resource)) {
        throw new ApiError(403, 'ليس لديك صلاحية تنفيذ هذا الإجراء', 'FORBIDDEN');
    }

    const clause = ownershipClause(user, resource);
    if (!clause) {
        throw new ApiError(403, 'ليس لديك صلاحية تنفيذ هذا الإجراء', 'FORBIDDEN');
    }

    if (clause.__deny__) {
        throw new ApiError(403, 'ليس لديك صلاحية تنفيذ هذا الإجراء', 'FORBIDDEN');
    }

    const scope = getOwnershipScope(user);
    if (
        !scope ||
        (scope.type === 'INSTRUCTOR' && !scope.userId) ||
        (scope.type === 'STUDENT' && !scope.userId)
    ) {
        throw new ApiError(403, 'ليس لديك صلاحية تنفيذ هذا الإجراء', 'FORBIDDEN');
    }

    const base = { ...where };
    const and = Array.isArray(base.AND) ? base.AND : base.AND ? [base.AND] : [];

    return { ...base, AND: [...and, clause] };
}

// ---------------------------------------------------------------------------
// Branch filtering for resources without a direct branchId column
// ---------------------------------------------------------------------------

function branchField(resource) {
    switch (resource) {
        case 'Branch':
            return 'id';
        case 'Room':
        case 'Student':
        case 'Payment':
            return 'branchId';
        default:
            return null;
    }
}

/**
 * Applies a branch filter for resources that are not directly branch-owned,
 * mapping to the correct relation. ADMIN is unrestricted.
 */
export function applyBranchFilterFor(user, where = {}, resource) {
    const scope = getBranchScope(user);
    if (scope === null) return { ...where };

    const inScope = { in: scope };
    const base = { ...where };
    const and = Array.isArray(base.AND) ? base.AND : base.AND ? [base.AND] : [];

    let clause;
    const direct = branchField(resource);

    if (direct) {
        return { ...base, [direct]: inScope };
    }

    switch (resource) {
        case 'Group':
            clause = { room: { branchId: inScope } };
            break;
        case 'Session':
            clause = { room: { branchId: inScope } };
            break;
        case 'Enrollment':
            clause = { group: { room: { branchId: inScope } } };
            break;
        case 'Attendance':
            clause = { session: { room: { branchId: inScope } } };
            break;
        default:
            // Unknown resource: fail closed.
            throw new ApiError(403, 'ليس لديك صلاحية تنفيذ هذا الإجراء', 'FORBIDDEN');
    }

    return { ...base, AND: [...and, clause] };
}

/**
 * Top-level access filter:
 * - ADMIN → unchanged
 * - BRANCH_MANAGER/SECRETARY → branch filter (relation-aware)
 * - INSTRUCTOR/STUDENT → ownership filter
 * - missing scope for a protected resource → 403 FORBIDDEN
 */
export function applyAccessFilter(user, where = {}, resource) {
    if (!user) throw new ApiError(401, 'يجب تسجيل الدخول أولاً', 'UNAUTHORIZED');

    if (user.role === 'ADMIN') return { ...where };

    if (BRANCH_SCOPED_ROLES.includes(user.role)) {
        const scope = getBranchScope(user);
        if (!scope || scope.length === 0) {
            throw new ApiError(403, 'لم يتم تعيين فرع لهذا الحساب', 'NO_BRANCH_ASSIGNED');
        }
        return applyBranchFilterFor(user, where, resource);
    }

    if (OWNERSHIP_SCOPED_ROLES.includes(user.role)) {
        return applyOwnershipFilter(user, where, resource);
    }

    throw new ApiError(403, 'ليس لديك صلاحية تنفيذ هذا الإجراء', 'FORBIDDEN');
}

// ---------------------------------------------------------------------------
// Single-record access
// ---------------------------------------------------------------------------

/**
 * Ownership guard for a single record. `allowRoles` is for roles that
 * legitimately manage the resource (for example ADMIN).
 */
export function assertOwnership(user, ownerUserId, { allowRoles = [] } = {}) {
    if (!user) {
        throw new ApiError(401, 'يجب تسجيل الدخول أولاً', 'UNAUTHORIZED');
    }

    if (allowRoles.includes(user.role)) return true;

    if (user.id !== ownerUserId) {
        throw new ApiError(403, 'لا يمكنك الوصول إلى هذا السجل', 'FORBIDDEN');
    }

    return true;
}

export function assertInstructorOwnsProfile(user, instructorUserId) {
    return assertOwnership(user, instructorUserId, { allowRoles: ['ADMIN', 'BRANCH_MANAGER'] });
}

export function assertStudentOwnsRecord(user, studentUserId) {
    return assertOwnership(user, studentUserId, {
        allowRoles: ['ADMIN', 'BRANCH_MANAGER', 'SECRETARY'],
    });
}

/**
 * Verifies access to a single loaded record.
 * - record missing → caller should 404 before calling.
 * - out-of-scope branch → 403
 * - ownership-scoped role not the owner → 403
 */
export function assertRecordAccess(user, record, { branchId = null, ownerUserId = null } = {}) {
    if (!user) throw new ApiError(401, 'يجب تسجيل الدخول أولاً', 'UNAUTHORIZED');
    if (!record) throw new ApiError(404, 'السجل المطلوب غير موجود', 'RECORD_NOT_FOUND');
    if (user.role === 'ADMIN') return true;

    if (BRANCH_SCOPED_ROLES.includes(user.role)) {
        const target = branchId ?? record.branchId ?? null;
        if (!target || !canAccessBranch(user, target)) {
            throw new ApiError(403, 'لا يمكنك الوصول لبيانات هذا الفرع', 'BRANCH_FORBIDDEN');
        }
        return true;
    }

    if (OWNERSHIP_SCOPED_ROLES.includes(user.role)) {
        const owner = ownerUserId ?? record.userId ?? record.ownerUserId ?? null;
        if (owner && owner !== user.id) {
            throw new ApiError(403, 'لا يمكنك الوصول إلى هذا السجل', 'FORBIDDEN');
        }
        return true;
    }

    throw new ApiError(403, 'ليس لديك صلاحية تنفيذ هذا الإجراء', 'FORBIDDEN');
}
