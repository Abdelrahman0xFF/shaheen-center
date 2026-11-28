import { z } from 'zod';
import { normalizeEgyptianPhone } from '../utils/phone.js';
import { MAX_PASSWORD_BYTES, passwordByteLength } from '../utils/password.js';

const PHONE_RE = /^01[0125]\d{8}$/;
const trimmed = z.string().trim();
const STAFF_ROLES_LIST = ['BRANCH_MANAGER', 'SECRETARY'];
const EMAIL_MAX_LENGTH = 254;

const phoneSchema = trimmed
    .refine((v) => PHONE_RE.test(v), 'رقم موبايل مصري غير صالح')
    .transform((v) => normalizeEgyptianPhone(v) || v);

const usernameSchema = trimmed
    .max(EMAIL_MAX_LENGTH, 'البريد الإلكتروني طويل جداً')
    .email('البريد الإلكتروني غير صالح')
    .transform((v) => v.toLowerCase());

const passwordSchema = z
    .string()
    .min(12, 'كلمة المرور يجب أن تكون 12 حرفاً على الأقل')
    .refine(
        (v) => passwordByteLength(v) <= MAX_PASSWORD_BYTES,
        `كلمة المرور يجب ألا تتجاوز ${MAX_PASSWORD_BYTES} بايت`,
    );

const branchIdsSchema = z
    .array(trimmed.min(1).max(128))
    .min(1, 'اختر فرعاً واحداً على الأقل')
    .max(20)
    .refine((a) => new Set(a).size === a.length, 'فروع مكررة');

export const listStaffQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: trimmed.max(200).optional().default(''),
    role: z.enum(STAFF_ROLES_LIST).optional(),
    isActive: z
        .enum(['true', 'false', '1', '0'])
        .transform((v) => v === 'true' || v === '1')
        .optional(),
    branchId: trimmed.max(128).optional(),
});

export const staffIdParamSchema = z.object({ id: trimmed.min(1).max(128) });

export const createStaffSchema = z.object({
    name: trimmed.min(2, 'الاسم مطلوب').max(120),
    phone: phoneSchema,
    username: usernameSchema.optional().nullable(),
    password: passwordSchema,
    role: z.enum(STAFF_ROLES_LIST),
    branchIds: branchIdsSchema,
});

export const updateStaffSchema = z
    .object({
        name: trimmed.min(2).max(120).optional(),
        phone: phoneSchema.optional(),
        username: usernameSchema.optional().nullable(),
        role: z.enum(STAFF_ROLES_LIST).optional(),
        branchIds: branchIdsSchema.optional(),
    })
    .refine((v) => Object.keys(v).length > 0, 'لا توجد بيانات للتحديث');

export const toggleStaffStatusSchema = z.object({ isActive: z.boolean() });

export const resetStaffPasswordSchema = z.object({ newPassword: passwordSchema });

export const STAFF_ROLES = STAFF_ROLES_LIST;
