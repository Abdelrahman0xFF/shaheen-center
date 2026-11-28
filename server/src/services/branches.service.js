import { prisma } from '../config/prisma.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { logAudit } from '../utils/auditLogger.js';
import { applyAccessFilter, assertBranchAccess, canAccessBranch } from '../utils/branchAccess.js';
import { buildPaginationMeta, parsePagination } from '../utils/response.js';

const NOT_FOUND = () => new ApiError(404, 'السجل المطلوب غير موجود', 'RECORD_NOT_FOUND');

function normalizePhone(phone) {
    if (phone === undefined) return undefined;
    if (phone === null) return null;
    const trimmed = String(phone).trim();
    return trimmed === '' ? null : trimmed;
}

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------

export async function listBranches(user, query = {}) {
    const { page, limit, skip } = parsePagination(query);
    const search = String(query.search || '').trim();

    let where = {};
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } },
        ];
    }
    if (query.isActive !== undefined) where.isActive = Boolean(query.isActive);

    // applyAccessFilter scopes manager/secretary to assigned branches.
    where = applyAccessFilter(user, where, 'Branch');

    const [total, items] = await Promise.all([
        prisma.branch.count({ where }),
        prisma.branch.findMany({
            where,
            orderBy: { name: 'asc' },
            skip,
            take: limit,
            include: { _count: { select: { rooms: true, students: true } } },
        }),
    ]);

    return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function getBranch(user, id) {
    const branch = await prisma.branch.findUnique({
        where: { id },
        include: { _count: { select: { rooms: true, students: true } } },
    });
    if (!branch) throw NOT_FOUND();
    if (!canAccessBranch(user, branch.id)) {
        throw new ApiError(403, 'لا يمكنك الوصول لبيانات هذا الفرع', 'BRANCH_FORBIDDEN');
    }
    return branch;
}

export async function createBranch(user, data, { ipAddress = null } = {}) {
    const name = String(data.name).trim();
    const existing = await prisma.branch.findFirst({ where: { name } });
    if (existing) throw new ApiError(409, 'يوجد فرع بنفس الاسم', 'DUPLICATE_ENTRY');

    const branch = await prisma.branch.create({
        data: {
            name,
            address: String(data.address).trim(),
            phone: normalizePhone(data.phone) ?? null,
            isActive: data.isActive ?? true,
        },
    });

    await logAudit({
        userId: user.id,
        action: 'BRANCH_CREATED',
        entity: 'Branch',
        entityId: branch.id,
        after: sanitizeBranch(branch),
        ipAddress,
    });

    return branch;
}

export async function updateBranch(user, id, data, { ipAddress = null } = {}) {
    const before = await prisma.branch.findUnique({ where: { id } });
    if (!before) throw NOT_FOUND();

    if (data.name !== undefined) {
        const name = String(data.name).trim();
        const dup = await prisma.branch.findFirst({ where: { name, id: { not: id } } });
        if (dup) throw new ApiError(409, 'يوجد فرع بنفس الاسم', 'DUPLICATE_ENTRY');
        data.name = name;
    }

    // Deactivation guard
    if (data.isActive === false) {
        const now = new Date();
        const [activeStudents, futureSessions] = await Promise.all([
            prisma.student.count({ where: { branchId: id, deletedAt: null } }),
            prisma.session.count({
                where: { room: { branchId: id }, status: 'SCHEDULED', startsAt: { gt: now } },
            }),
        ]);
        if (activeStudents > 0 || futureSessions > 0) {
            throw new ApiError(
                409,
                'لا يمكن تعطيل فرع يحتوي على بيانات نشطة',
                'BRANCH_HAS_ACTIVE_DATA',
                {
                    activeStudents,
                    futureSessions,
                },
            );
        }
    }

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.address !== undefined) updateData.address = String(data.address).trim();
    if (data.phone !== undefined) updateData.phone = normalizePhone(data.phone) ?? null;
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

    const branch = await prisma.branch.update({ where: { id }, data: updateData });

    await logAudit({
        userId: user.id,
        action: 'BRANCH_UPDATED',
        entity: 'Branch',
        entityId: id,
        before: sanitizeBranch(before),
        after: sanitizeBranch(branch),
        ipAddress,
    });

    return branch;
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export async function listRooms(user, branchId, query = {}) {
    const { page, limit, skip } = parsePagination(query);
    assertBranchAccess(user, branchId);

    const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true },
    });
    if (!branch) throw NOT_FOUND();

    const search = String(query.search || '').trim();
    const where = { branchId };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (query.isActive !== undefined) where.isActive = Boolean(query.isActive);

    const [total, items] = await Promise.all([
        prisma.room.count({ where }),
        prisma.room.findMany({
            where,
            orderBy: { name: 'asc' },
            skip,
            take: limit,
            include: { _count: { select: { groups: true, sessions: true } } },
        }),
    ]);

    return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function createRoom(user, branchId, data, { ipAddress = null } = {}) {
    assertBranchAccess(user, branchId);

    const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true },
    });
    if (!branch) throw NOT_FOUND();

    const name = String(data.name).trim();
    const dup = await prisma.room.findFirst({ where: { branchId, name } });
    if (dup) throw new ApiError(409, 'يوجد قاعة بنفس الاسم في هذا الفرع', 'DUPLICATE_ENTRY');

    const room = await prisma.room.create({
        data: { branchId, name, capacity: data.capacity, isActive: data.isActive ?? true },
    });

    await logAudit({
        userId: user.id,
        action: 'ROOM_CREATED',
        entity: 'Room',
        entityId: room.id,
        after: room,
        ipAddress,
    });

    return room;
}

export async function updateRoom(user, roomId, data, { ipAddress = null } = {}) {
    const before = await prisma.room.findUnique({ where: { id: roomId } });
    if (!before) throw NOT_FOUND();

    assertBranchAccess(user, before.branchId);

    if (data.name !== undefined) {
        const name = String(data.name).trim();
        const dup = await prisma.room.findFirst({
            where: { branchId: before.branchId, name, id: { not: roomId } },
        });
        if (dup) throw new ApiError(409, 'يوجد قاعة بنفس الاسم في هذا الفرع', 'DUPLICATE_ENTRY');
        data.name = name;
    }

    // Capacity cannot drop below active group capacity.
    if (data.capacity !== undefined) {
        const maxGroupCapacity = await prisma.group.aggregate({
            where: { roomId, isActive: true },
            _max: { capacity: true },
        });
        const minRequired = maxGroupCapacity._max.capacity ?? 0;
        if (data.capacity < minRequired) {
            throw new ApiError(409, 'السعة أقل من سعة المجموعات النشطة', 'CAPACITY_TOO_LOW', {
                minRequired,
            });
        }
    }

    // Deactivation guard: no future scheduled sessions.
    if (data.isActive === false) {
        const now = new Date();
        const futureSessions = await prisma.session.count({
            where: { roomId, status: 'SCHEDULED', startsAt: { gt: now } },
        });
        if (futureSessions > 0) {
            throw new ApiError(409, 'لا يمكن تعطيل قاعة لديها حصص مجدولة', 'ROOM_HAS_ACTIVE_DATA', {
                futureSessions,
            });
        }
    }

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.capacity !== undefined) updateData.capacity = data.capacity;
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

    const room = await prisma.room.update({ where: { id: roomId }, data: updateData });

    await logAudit({
        userId: user.id,
        action: 'ROOM_UPDATED',
        entity: 'Room',
        entityId: roomId,
        before,
        after: room,
        ipAddress,
    });

    return room;
}

function sanitizeBranch(branch) {
    return {
        id: branch.id,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        isActive: branch.isActive,
    };
}
