import { describe, expect, it } from 'vitest';
import {
    MAX_PASSWORD_BYTES,
    hashPassword,
    isPasswordWithinBcryptLimit,
    passwordByteLength,
    verifyPassword,
} from './password.js';

describe('password utilities', () => {
    it('defines the bcrypt 72-byte limit', () => {
        expect(MAX_PASSWORD_BYTES).toBe(72);
    });

    it('measures UTF-8 byte length of a password', () => {
        expect(passwordByteLength('abcd')).toBe(4);
        expect(passwordByteLength('ع')).toBe(2); // Arabic letter = 2 bytes
    });

    it('accepts passwords at or under 72 bytes', () => {
        const underLimit = 'a'.repeat(72);
        expect(isPasswordWithinBcryptLimit(underLimit)).toBe(true);
    });

    it('rejects passwords over 72 bytes', () => {
        const overLimit = 'a'.repeat(73);
        expect(isPasswordWithinBcryptLimit(overLimit)).toBe(false);
    });

    it('verifies a correct password', async () => {
        const hash = await hashPassword('Secret123456!');
        expect(await verifyPassword('Secret123456!', hash)).toBe(true);
    });

    it('rejects a wrong password', async () => {
        const hash = await hashPassword('Secret123456!');
        expect(await verifyPassword('WrongPass123456!', hash)).toBe(false);
    });

    it('returns false for missing inputs without throwing', async () => {
        expect(await verifyPassword('', 'hash')).toBe(false);
        expect(await verifyPassword('password', '')).toBe(false);
        expect(await verifyPassword('', '')).toBe(false);
    });
});
