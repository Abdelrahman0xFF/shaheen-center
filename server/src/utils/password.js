import bcrypt from 'bcryptjs';
import { ApiError } from '../middlewares/errorHandler.js';

/**
 * bcrypt only considers the first 72 bytes of a password. We reject longer
 * inputs instead of silently truncating them (NFR-SEC-06).
 */
export const MAX_PASSWORD_BYTES = 72;

/** Matches the cost used by the existing seeded Admin account. */
export const BCRYPT_COST = 12;

/**
 * Fixed bcrypt hash used to equalise response time when an identifier does not
 * exist. It is a hash of a random throw-away value, never a real password.
 */
export const DUMMY_PASSWORD_HASH = '$2b$12$nKrwbmbr4wSlfB0jhXW.VuG7txrBBig2OcgYBOp7F/VhzjwyRwWpu';

export function passwordByteLength(password) {
    return Buffer.byteLength(String(password ?? ''), 'utf8');
}

export function isPasswordWithinBcryptLimit(password) {
    return passwordByteLength(password) <= MAX_PASSWORD_BYTES;
}

export function assertPasswordWithinBcryptLimit(password) {
    if (!isPasswordWithinBcryptLimit(password)) {
        throw new ApiError(
            400,
            `كلمة المرور يجب ألا تتجاوز ${MAX_PASSWORD_BYTES} بايت`,
            'PASSWORD_TOO_LONG',
        );
    }
}

export async function hashPassword(password) {
    assertPasswordWithinBcryptLimit(password);
    return bcrypt.hash(password, BCRYPT_COST);
}

/**
 * Verifies a password without ever truncating it. Inputs over 72 bytes can
 * never match because they are rejected before bcrypt sees them.
 */
export async function verifyPassword(password, passwordHash) {
    if (!password || !passwordHash) return false;
    if (!isPasswordWithinBcryptLimit(password)) return false;

    try {
        return await bcrypt.compare(password, passwordHash);
    } catch {
        return false;
    }
}
