import { prisma } from '../config/prisma.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { logAudit } from '../utils/auditLogger.js';
import { buildPaginationMeta, parsePagination } from '../utils/response.js';
import { cairoDateEndUtc, cairoDateStartUtc } from '../utils/dateTime.js';
import { SETTING_KEYS } from '../validators/settings.validator.js';

const NOT_FOUND = () => new ApiError(404, 'السجل المطلوب غير موجود', 'RECORD_NOT_FOUND');

// ---------------------------------------------------------------------------
// Typed settings
// ---------------------------------------------------------------------------

const SETTING_DEFAULTS = {
    late_threshold_minutes: 10,
    absence_alert_minutes: 30,
    working_days: [0, 1, 2, 3, 4], // Sun–Thu
    center_name: 'سنتر شاهين',
    currency: 'EGP',
    timezone: 'Africa/Cairo',
};

function parseWorkingDays(raw) {
    if (Array.isArray(raw))
        return raw.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
    return String(raw ?? '')
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
}

export async function getSettings() {
    const rows = await prisma.setting.findMany({ where: { key: { in: SETTING_KEYS } } });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    return {
        late_threshold_minutes: Number(
            map.late_threshold_minutes ?? SETTING_DEFAULTS.late_threshold_minutes,
        ),
        absence_alert_minutes: Number(
            map.absence_alert_minutes ?? SETTING_DEFAULTS.absence_alert_minutes,
        ),
        working_days:
            map.working_days !== undefined
                ? parseWorkingDays(map.working_days)
                : SETTING_DEFAULTS.working_days,
        center_name: map.center_name ?? SETTING_DEFAULTS.center_name,
        currency: 'EGP',
        timezone: 'Africa/Cairo',
    };
}

export async function updateSettings(actor, data, { ipAddress = null } = {}) {
    const current = await getSettings();
    const changed = {};

    for (const key of SETTING_KEYS) {
        if (data[key] === undefined) continue;
        let newValue;
        if (key === 'working_days') {
            newValue = [...data[key]].sort((a, b) => a - b).join(',');
        } else if (key === 'late_threshold_minutes' || key === 'absence_alert_minutes') {
            newValue = String(data[key]);
        } else {
            newValue = String(data[key]);
        }
        const currentValue =
            key === 'working_days'
                ? [...current.working_days].sort((a, b) => a - b).join(',')
                : String(current[key]);
        if (newValue !== currentValue) changed[key] = newValue;
    }

    if (Object.keys(changed).length > 0) {
        await prisma.$transaction(async (tx) => {
            for (const [key, value] of Object.entries(changed)) {
                await tx.setting.upsert({
                    where: { key },
                    update: { value },
                    create: { key, value },
                });
            }
        });

        await logAudit({
            userId: actor.id,
            action: 'SETTINGS_UPDATED',
            entity: 'Setting',
            entityId: null,
            before: pick(current, Object.keys(changed)),
            after: changed,
            ipAddress,
        });
    }

    return getSettings();
}

function pick(obj, keys) {
    const out = {};
    for (const k of keys) out[k] = obj[k];
    return out;
}

// ---------------------------------------------------------------------------
// Academic terms
// ---------------------------------------------------------------------------

export async function listTerms(query = {}) {
    const { page, limit, skip } = parsePagination(query);
    const where = {};
    if (query.search) where.name = { contains: String(query.search).trim(), mode: 'insensitive' };
    if (query.isActive !== undefined) where.isActive = Boolean(query.isActive);
    if (query.year) where.year = String(query.year);

    const [total, items] = await Promise.all([
        prisma.academicTerm.count({ where }),
        prisma.academicTerm.findMany({ where, orderBy: { startDate: 'desc' }, skip, take: limit }),
    ]);

    return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function createTerm(actor, data, { ipAddress = null } = {}) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (!(startDate < endDate))
        throw new ApiError(400, 'تاريخ البداية يجب أن يسبق النهاية', 'VALIDATION_ERROR');

    const term = await prisma.$transaction(async (tx) => {
        if (data.isActive ?? true) {
            const active = await tx.academicTerm.findFirst({ where: { isActive: true } });
            if (active) throw new ApiError(409, 'يوجد فصل دراسي نشط بالفعل', 'ACTIVE_TERM_EXISTS');
        }
        return tx.academicTerm.create({
            data: {
                name: data.name.trim(),
                year: data.year.trim(),
                startDate,
                endDate,
                isActive: data.isActive ?? true,
            },
        });
    });

    await logAudit({
        userId: actor.id,
        action: 'ACADEMIC_TERM_CREATED',
        entity: 'AcademicTerm',
        entityId: term.id,
        after: term,
        ipAddress,
    });
    return term;
}

export async function updateTerm(actor, id, data, { ipAddress = null } = {}) {
    const before = await prisma.academicTerm.findUnique({ where: { id } });
    if (!before) throw NOT_FOUND();

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.year !== undefined) updateData.year = data.year.trim();
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const newStart = updateData.startDate ?? before.startDate;
    const newEnd = updateData.endDate ?? before.endDate;
    if (!(new Date(newStart) < new Date(newEnd)))
        throw new ApiError(400, 'تاريخ البداية يجب أن يسبق النهاية', 'VALIDATION_ERROR');

    const term = await prisma.$transaction(async (tx) => {
        if (updateData.isActive === true) {
            const active = await tx.academicTerm.findFirst({
                where: { isActive: true, id: { not: id } },
            });
            if (active) throw new ApiError(409, 'يوجد فصل دراسي نشط بالفعل', 'ACTIVE_TERM_EXISTS');
        }
        return tx.academicTerm.update({ where: { id }, data: updateData });
    });

    await logAudit({
        userId: actor.id,
        action: 'ACADEMIC_TERM_UPDATED',
        entity: 'AcademicTerm',
        entityId: id,
        before,
        after: term,
        ipAddress,
    });
    return term;
}

// ---------------------------------------------------------------------------
// Holidays
// ---------------------------------------------------------------------------

export async function listHolidays(query = {}) {
    const { page, limit, skip } = parsePagination(query);
    const where = {};
    if (query.termId) where.termId = query.termId;
    if (query.search) where.name = { contains: String(query.search).trim(), mode: 'insensitive' };
    if (query.from || query.to) {
        where.date = {};
        if (query.from) where.date.gte = new Date(query.from);
        if (query.to) where.date.lte = new Date(query.to);
    }

    const [total, items] = await Promise.all([
        prisma.holiday.count({ where }),
        prisma.holiday.findMany({ where, orderBy: { date: 'asc' }, skip, take: limit }),
    ]);

    return { items, meta: buildPaginationMeta(page, limit, total) };
}

async function assertTermExists(termId) {
    if (!termId) return;
    const term = await prisma.academicTerm.findUnique({
        where: { id: termId },
        select: { id: true },
    });
    if (!term) throw new ApiError(400, 'الفصل الدراسي غير موجود', 'TERM_NOT_FOUND');
}

export async function createHoliday(actor, data, { ipAddress = null } = {}) {
    await assertTermExists(data.termId ?? null);
    const date = new Date(`${data.date}T00:00:00.000Z`);

    const dup = await prisma.holiday.findFirst({ where: { date, name: data.name.trim() } });
    if (dup) throw new ApiError(409, 'الإجازة موجودة بالفعل', 'DUPLICATE_ENTRY');

    const holiday = await prisma.holiday.create({
        data: {
            name: data.name.trim(),
            date,
            termId: data.termId ?? null,
            isExceptional: data.isExceptional ?? false,
        },
    });

    await logAudit({
        userId: actor.id,
        action: 'HOLIDAY_CREATED',
        entity: 'Holiday',
        entityId: holiday.id,
        after: holiday,
        ipAddress,
    });
    return holiday;
}

export async function updateHoliday(actor, id, data, { ipAddress = null } = {}) {
    const before = await prisma.holiday.findUnique({ where: { id } });
    if (!before) throw NOT_FOUND();

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.date !== undefined) updateData.date = new Date(`${data.date}T00:00:00.000Z`);
    if (data.termId !== undefined) {
        await assertTermExists(data.termId);
        updateData.termId = data.termId ?? null;
    }
    if (data.isExceptional !== undefined) updateData.isExceptional = data.isExceptional;

    const holiday = await prisma.holiday.update({ where: { id }, data: updateData });
    await logAudit({
        userId: actor.id,
        action: 'HOLIDAY_UPDATED',
        entity: 'Holiday',
        entityId: id,
        before,
        after: holiday,
        ipAddress,
    });
    return holiday;
}

export async function deleteHoliday(actor, id, { ipAddress = null } = {}) {
    const before = await prisma.holiday.findUnique({ where: { id } });
    if (!before) throw NOT_FOUND();
    await prisma.holiday.delete({ where: { id } });
    await logAudit({
        userId: actor.id,
        action: 'HOLIDAY_DELETED',
        entity: 'Holiday',
        entityId: id,
        before,
        ipAddress,
    });
    return { id };
}

// ---------------------------------------------------------------------------
// Audit log (read-only, ADMIN)
// ---------------------------------------------------------------------------

export async function listAuditLogs(query = {}) {
    const { page, limit, skip } = parsePagination(query);
    const where = {};
    if (query.userId) where.userId = query.userId;
    if (query.action) where.action = query.action;
    if (query.entity) where.entity = query.entity;
    if (query.entityId) where.entityId = query.entityId;
    if (query.from || query.to) {
        where.createdAt = {};
        // Audit timestamps are displayed in Africa/Cairo, so filter on the same
        // calendar-day boundaries. `to` is inclusive (end of the Cairo day).
        if (query.from) where.createdAt.gte = cairoDateStartUtc(query.from);
        if (query.to) where.createdAt.lte = cairoDateEndUtc(query.to);
    }
    if (query.search) {
        where.OR = [
            { action: { contains: query.search, mode: 'insensitive' } },
            { entity: { contains: query.search, mode: 'insensitive' } },
        ];
    }

    const [total, items] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: { user: { select: { id: true, name: true, role: true } } },
        }),
    ]);

    return { items, meta: buildPaginationMeta(page, limit, total) };
}
