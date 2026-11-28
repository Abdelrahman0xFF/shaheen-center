import { z } from 'zod';
import { looksLikePhoneIdentifier, normalizeEgyptianPhone } from '../utils/phone.js';
import { normalizeEmail } from '../utils/email.js';
import { MAX_PASSWORD_BYTES, passwordByteLength } from '../utils/password.js';

const identifierSchema = z
    .string()
    .trim()
    .min(3, 'أدخل رقم الموبايل أو البريد الإلكتروني')
    .max(254, 'البيانات المدخلة طويلة جداً')
    .refine((value) => {
        if (looksLikePhoneIdentifier(value)) {
            return normalizeEgyptianPhone(value) !== null;
        }

        return !/[\u0000-\u001F\u007F]/.test(value);
    }, 'أدخل رقم موبايل مصري صحيح أو بريد إلكتروني صالح');

const passwordSchema = z
    .string()
    .min(1, 'كلمة المرور مطلوبة')
    .refine(
        (value) => passwordByteLength(value) <= MAX_PASSWORD_BYTES,
        `كلمة المرور يجب ألا تتجاوز ${MAX_PASSWORD_BYTES} بايت`,
    );

export const loginSchema = z.object({
    identifier: identifierSchema,
    password: passwordSchema,
});

/**
 * Converts an accepted phone form (+20/0020/20/local) to the stored local
 * 11-digit form. A non-phone identifier (a staff email address) is trimmed,
 * lowercased, and returned; matching is also case-insensitive in Prisma.
 */
export function normalizeLoginIdentifier(identifier) {
    const value = String(identifier ?? '').trim();
    return normalizeEgyptianPhone(value) || normalizeEmail(value);
}
