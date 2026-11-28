import { prisma } from '../config/prisma.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { logAudit } from '../utils/auditLogger.js';
import { hashPassword } from '../utils/password.js';
import { normalizeEgyptianPhone } from '../utils/phone.js';
import { normalizeEmail } from '../utils/email.js';
import { buildPaginationMeta, parsePagination } from '../utils/response.js';

const SAFE_SELECT = {
    id: true,
    name: true,
    phone: true,
    username: true,
    role: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    branches: { select: { branchId: true, branch: { select: { id: true, name: true } } } },
};

const NOT_FOUND = () => new ApiError(404, 'الموظف غير موجود', 'RECORD_NOT_FOUND');

function normalizePhone(phone) {
    return normalizeEgyptianPhone(phone) || String(phone).trim();
}

function safeStaff(user) {
    if (!user) return null;
    const { passwordHash, ...rest } = user;
    return {
        id: rest.id,
        name: rest.name,
        phone: rest.phone,
        username: rest.username ?? null,
        role: rest.role,
        isActive: rest.isActive,
        createdAt: rest.createdAt,
        updatedAt: rest.updatedAt,
        branchIds: (rest.branches || []).map((b) => b.branchId),
        branches: (rest.branches || []).map((b) => b.branch).filter(Boolean),
    };
}

async function assertBranchesExist(branchIds) {
    const found = await prisma.branch.findMany({
        where: { id: { in: branchIds }, isActive: true },
        select: { id: true },
    });
    const foundIds = new Set(found.map((b) => b.id));
    const missing = branchIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
        throw new ApiError(400, 'أحد الفروع المحددة غير موجود أو غير نشط', 'BRANCH_NOT_FOUND', {
            missing,
        });
    }
}

async function revokeAllSessions(userId, tx) {
    return (tx || prisma).refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
    });
}

export async function listStaff(query = {}) {
    const { page, limit, skip } = parsePagination(query);
    const search = String(query.search || '').trim();

    const where = { role: { in: ['BRANCH_MANAGER', 'SECRETARY'] } };
    if (query.role) where.role = query.role;
    if (query.isActive !== undefined) where.isActive = Boolean(query.isActive);
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { username: { contains: search, mode: 'insensitive' } },
        ];
    }
    if (query.branchId) {
        where.branches = { some: { branchId: query.branchId } };
    }

    const [total, items] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
            where,
            select: SAFE_SELECT,
            orderBy: { name: 'asc' },
            skip,
            take: limit,
        }),
    ]);

    return { items: items.map(safeStaff), meta: buildPaginationMeta(page, limit, total) };
}

export async function createStaff(actor, data, { ipAddress = null } = {}) {
    const phone = normalizePhone(data.phone);
    // `username` is the staff member's email address; trim + lowercase.
    const username = data.username ? normalizeEmail(data.username) : null;
    const branchIds = [...new Set(data.branchIds)];

    // Uniqueness
    const dupPhone = await prisma.user.findFirst({ where: { phone } });
    if (dupPhone) throw new ApiError(409, 'رقم الموبايل مستخدم بالفعل', 'DUPLICATE_ENTRY');
    if (username) {
        // Reject duplicate emails, including case-only differences.
        const dupUser = await prisma.user.findFirst({
            where: { username: { equals: username, mode: 'insensitive' } },
        });
        if (dupUser) throw new ApiError(409, 'البريد الإلكتروني مستخدم بالفعل', 'DUPLICATE_ENTRY');
    }

    await assertBranchesExist(branchIds);

    const passwordHash = await hashPassword(data.password);

    const created = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                name: data.name.trim(),
                phone,
                username,
                passwordHash,
                role: data.role,
                isActive: true,
            },
        });
        await tx.userBranch.createMany({
            data: branchIds.map((branchId) => ({ userId: user.id, branchId })),
        });
        const withBranches = await tx.user.findUnique({
            where: { id: user.id },
            select: SAFE_SELECT,
        });
        return withBranches;
    });

    const safe = safeStaff(created);

    await logAudit({
        userId: actor.id,
        action: 'STAFF_CREATED',
        entity: 'User',
        entityId: created.id,
        after: safe,
        ipAddress,
    });

    return safe;
}

export async function updateStaff(actor, id, data, { ipAddress = null } = {}) {
    const before = await prisma.user.findUnique({
        where: { id },
        select: { ...SAFE_SELECT, role: true, isActive: true },
    });
    if (!before || !['BRANCH_MANAGER', 'SECRETARY'].includes(before.role)) throw NOT_FOUND();
    if (before.role === 'ADMIN') throw new ApiError(403, 'لا يمكن تعديل هذا الحساب', 'FORBIDDEN');

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.phone !== undefined) {
        const phone = normalizePhone(data.phone);
        const dup = await prisma.user.findFirst({ where: { phone, id: { not: id } } });
        if (dup) throw new ApiError(409, 'رقم الموبايل مستخدم بالفعل', 'DUPLICATE_ENTRY');
        updateData.phone = phone;
    }
    if (data.username !== undefined) {
        // `username` is the staff member's email address; trim + lowercase.
        const username = data.username ? normalizeEmail(data.username) : null;
        if (username) {
            // Reject duplicate emails, including case-only differences.
            const dup = await prisma.user.findFirst({
                where: { username: { equals: username, mode: 'insensitive' }, id: { not: id } },
            });
            if (dup) throw new ApiError(409, 'البريد الإلكتروني مستخدم بالفعل', 'DUPLICATE_ENTRY');
        }
        updateData.username = username;
    }
    if (data.role !== undefined) updateData.role = data.role;

    const branchIds = data.branchIds ? [...new Set(data.branchIds)] : null;
    if (branchIds) await assertBranchesExist(branchIds);

    const roleChanged = data.role !== undefined && data.role !== before.role;
    const branchesChanged =
        branchIds !== null &&
        !sameSet(
            branchIds,
            (before.branches || []).map((b) => b.branchId),
        );

    // Bump inside the same transaction so a committed role/branch change can
    // never leave previously-issued access tokens valid.
    if (roleChanged || branchesChanged) updateData.tokenVersion = { increment: 1 };

    const updated = await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({ where: { id }, data: updateData });
        if (branchIds) {
            await tx.userBranch.deleteMany({ where: { userId: id } });
            await tx.userBranch.createMany({
                data: branchIds.map((branchId) => ({ userId: id, branchId })),
            });
        }
        const withBranches = await tx.user.findUnique({ where: { id }, select: SAFE_SELECT });
        return { user, withBranches };
    });

    let revoked = { count: 0 };
    if (roleChanged || branchesChanged) {
        revoked = await revokeAllSessions(id);
    }

    const safeBefore = safeStaff(before);
    const safeAfter = safeStaff(updated.withBranches);

    await logAudit({
        userId: actor.id,
        action: 'STAFF_UPDATED',
        entity: 'User',
        entityId: id,
        before: safeBefore,
        after: safeAfter,
        ipAddress,
    });

    if (revoked.count > 0) {
        await logAudit({
            userId: actor.id,
            action: 'STAFF_SESSIONS_REVOKED',
            entity: 'User',
            entityId: id,
            after: { revokedSessions: revoked.count },
            ipAddress,
        });
    }

    return safeAfter;
}

export async function toggleStaffStatus(actor, id, isActive, { ipAddress = null } = {}) {
    const before = await prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
    if (!before || !['BRANCH_MANAGER', 'SECRETARY'].includes(before.role)) throw NOT_FOUND();

    if (!isActive && id === actor.id) {
        throw new ApiError(409, 'لا يمكنك تعطيل حسابك الخاص', 'CANNOT_DEACTIVATE_SELF');
    }

    const { updated, revoked } = await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
            where: { id },
            data: isActive ? { isActive } : { isActive, tokenVersion: { increment: 1 } },
            select: SAFE_SELECT,
        });
        const sessions = isActive ? { count: 0 } : await revokeAllSessions(id, tx);
        return { updated: user, revoked: sessions };
    });

    await logAudit({
        userId: actor.id,
        action: isActive ? 'STAFF_ACTIVATED' : 'STAFF_DEACTIVATED',
        entity: 'User',
        entityId: id,
        before: safeStaff(before),
        after: safeStaff(updated),
        ipAddress,
    });

    if (revoked.count > 0) {
        await logAudit({
            userId: actor.id,
            action: 'STAFF_SESSIONS_REVOKED',
            entity: 'User',
            entityId: id,
            after: { revokedSessions: revoked.count },
            ipAddress,
        });
    }

    return safeStaff(updated);
}

export async function resetStaffPassword(actor, id, newPassword, { ipAddress = null } = {}) {
    const target = await prisma.user.findUnique({
        where: { id },
        select: { id: true, role: true },
    });
    if (!target || !['BRANCH_MANAGER', 'SECRETARY'].includes(target.role)) throw NOT_FOUND();

    const passwordHash = await hashPassword(newPassword);

    const revoked = await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id },
            data: { passwordHash, tokenVersion: { increment: 1 } },
        });
        return revokeAllSessions(id, tx);
    });

    await logAudit({
        userId: actor.id,
        action: 'STAFF_PASSWORD_RESET',
        entity: 'User',
        entityId: id,
        after: { revokedSessions: revoked.count },
        ipAddress,
    });

    return { success: true, revokedSessions: revoked.count };
}

function sameSet(a, b) {
    if (a.length !== b.length) return false;
    const sa = new Set(a);
    return b.every((x) => sa.has(x));
}
