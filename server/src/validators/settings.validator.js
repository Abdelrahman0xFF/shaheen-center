import { z } from 'zod';
import { cairoDateStartUtc } from '../utils/dateTime.js';

const trimmed = z.string().trim();

export const SETTING_KEYS = [
    'late_threshold_minutes',
    'absence_alert_minutes',
    'working_days',
    'center_name',
    'currency',
    'timezone',
];

const workingDaysSchema = z
    .array(z.coerce.number().int().min(0).max(6))
    .min(1)
    .refine((a) => new Set(a).size === a.length, 'أيام مكررة');

export const updateSettingsSchema = z
    .object({
        late_threshold_minutes: z.coerce.number().int().min(0).max(120).optional(),
        absence_alert_minutes: z.coerce.number().int().min(0).max(120).optional(),
        working_days: workingDaysSchema.optional(),
        center_name: trimmed.min(2).max(100).optional(),
        currency: z.literal('EGP').optional(),
        timezone: z.literal('Africa/Cairo').optional(),
    })
    .refine((v) => Object.keys(v).length > 0, 'لا توجد بيانات للتحديث');

export const listTermsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: trimmed.max(200).optional().default(''),
    isActive: z
        .enum(['true', 'false', '1', '0'])
        .transform((v) => v === 'true' || v === '1')
        .optional(),
    year: trimmed.max(20).optional(),
});

export const termIdParamSchema = z.object({ id: trimmed.min(1).max(128) });

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const dateOnly = trimmed.refine(
    (v) => DATE_RE.test(v) && cairoDateStartUtc(v) !== null,
    'تاريخ غير صالح (YYYY-MM-DD)',
);

const termBase = {
    name: trimmed.min(1, 'اسم الفصل مطلوب').max(120),
    year: trimmed.min(1).max(20),
    startDate: trimmed.refine((v) => !Number.isNaN(Date.parse(v)), 'تاريخ غير صالح'),
    endDate: trimmed.refine((v) => !Number.isNaN(Date.parse(v)), 'تاريخ غير صالح'),
    isActive: z.boolean().optional(),
};

export const createTermSchema = z
    .object(termBase)
    .refine(
        (v) => new Date(v.startDate).getTime() < new Date(v.endDate).getTime(),
        'تاريخ البداية يجب أن يسبق النهاية',
    );

export const updateTermSchema = z
    .object({
        name: termBase.name.optional(),
        year: termBase.year.optional(),
        startDate: termBase.startDate.optional(),
        endDate: termBase.endDate.optional(),
        isActive: z.boolean().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, 'لا توجد بيانات للتحديث');

export const listHolidaysQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    termId: trimmed.max(128).optional(),
    from: dateOnly.optional(),
    to: dateOnly.optional(),
    search: trimmed.max(200).optional().default(''),
});

export const holidayIdParamSchema = z.object({ id: trimmed.min(1).max(128) });

export const createHolidaySchema = z.object({
    name: trimmed.min(1, 'اسم الإجازة مطلوب').max(120),
    date: trimmed.refine(
        (v) => DATE_RE.test(v) && !Number.isNaN(Date.parse(v)),
        'تاريخ غير صالح (YYYY-MM-DD)',
    ),
    termId: trimmed.max(128).optional().nullable(),
    isExceptional: z.boolean().optional().default(false),
});

export const updateHolidaySchema = z
    .object({
        name: trimmed.min(1).max(120).optional(),
        date: trimmed
            .refine(
                (v) => DATE_RE.test(v) && !Number.isNaN(Date.parse(v)),
                'تاريخ غير صالح (YYYY-MM-DD)',
            )
            .optional(),
        termId: trimmed.max(128).optional().nullable(),
        isExceptional: z.boolean().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, 'لا توجد بيانات للتحديث');

export const listAuditLogsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    userId: trimmed.max(128).optional(),
    action: trimmed.max(100).optional(),
    entity: trimmed.max(100).optional(),
    entityId: trimmed.max(128).optional(),
    from: dateOnly.optional(),
    to: dateOnly.optional(),
    search: trimmed.max(200).optional().default(''),
});
