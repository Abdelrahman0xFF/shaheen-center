import { z } from 'zod';

const PHONE_RE = /^01[0125]\d{8}$/;
const trimmed = z.string().trim();

export const listQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: trimmed.max(200).optional().default(''),
    isActive: z
        .enum(['true', 'false', '1', '0'])
        .transform((v) => v === 'true' || v === '1')
        .optional(),
});

export const listBranchesQuerySchema = listQuerySchema;
export const listRoomsQuerySchema = listQuerySchema;

export const branchIdParamSchema = z.object({ id: trimmed.min(1).max(128) });
export const branchIdRoomsParamSchema = z.object({ branchId: trimmed.min(1).max(128) });
export const roomIdParamSchema = z.object({ roomId: trimmed.min(1).max(128) });

export const createBranchSchema = z.object({
    name: trimmed.min(2, 'اسم الفرع مطلوب').max(120),
    address: trimmed.min(1, 'العنوان مطلوب').max(300),
    phone: trimmed
        .max(20)
        .refine((v) => v === '' || PHONE_RE.test(v), 'رقم هاتف غير صالح')
        .optional()
        .nullable(),
    isActive: z.boolean().optional().default(true),
});

export const updateBranchSchema = z
    .object({
        name: trimmed.min(2).max(120).optional(),
        address: trimmed.min(1).max(300).optional(),
        phone: trimmed
            .max(20)
            .refine((v) => v === '' || PHONE_RE.test(v), 'رقم هاتف غير صالح')
            .optional()
            .nullable(),
        isActive: z.boolean().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, 'لا توجد بيانات للتحديث');

export const createRoomSchema = z.object({
    name: trimmed.min(1, 'اسم القاعة مطلوب').max(120),
    capacity: z.coerce.number().int().min(1).max(500),
    isActive: z.boolean().optional().default(true),
});

export const updateRoomSchema = z
    .object({
        name: trimmed.min(1).max(120).optional(),
        capacity: z.coerce.number().int().min(1).max(500).optional(),
        isActive: z.boolean().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, 'لا توجد بيانات للتحديث');
