import crypto from 'crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';

function getKeyBuffer() {
    const buf = Buffer.from(env.encryptionKey, 'hex');
    if (buf.length !== 32) {
        throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }
    return buf;
}

/**
 * Encrypts sensitive strings (e.g., Egyptian National ID) with AES-256-GCM.
 * Output format: ivHex:authTagHex:cipherHex (FR-STU-05, NFR-SEC-03).
 */
export function encryptSensitive(plaintext) {
    if (!plaintext) return null;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, getKeyBuffer(), iv);
    const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts AES-256-GCM payload. Call ONLY for ADMIN role (AC-06).
 */
export function decryptSensitive(payload) {
    if (!payload) return null;
    const [ivHex, authTagHex, cipherHex] = String(payload).split(':');
    if (!ivHex || !authTagHex || !cipherHex) {
        throw new Error('Invalid encrypted payload format');
    }
    const decipher = crypto.createDecipheriv(ALGORITHM, getKeyBuffer(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(cipherHex, 'hex')),
        decipher.final(),
    ]);
    return decrypted.toString('utf8');
}

/**
 * Deterministic keyed HMAC-SHA256 blind index for Admin National ID search & duplicate checks (FR-STU-09, 10).
 */
export function createBlindIndex(value) {
    if (!value) return null;
    return crypto
        .createHmac('sha256', env.blindIndexSecret)
        .update(String(value).trim())
        .digest('hex');
}

/**
 * Generates an unguessable, non-PII QR token (FR-STU-02, NFR-SEC-04).
 */
export function generateQrToken() {
    return crypto.randomBytes(24).toString('base64url');
}
