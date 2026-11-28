import { describe, expect, it, vi } from 'vitest';
import {
    getRefreshTokenTtlMs,
    generateRefreshToken,
    hashRefreshToken,
    signAccessToken,
    verifyAccessToken,
} from './token.js';

vi.mock('../config/env.js', () => ({
    env: {
        jwtSecret: 'test-jwt-secret-that-is-at-least-32-characters-long',
        jwtExpiresIn: '15m',
        jwtIssuer: 'shaheen-center-api',
        jwtAudience: 'shaheen-center-client',
        refreshTokenExpiresIn: '1h',
        isProduction: false,
    },
}));

describe('token utilities', () => {
    it('generates an opaque refresh token', () => {
        const token = generateRefreshToken();
        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(32);
        // base64url alphabet only
        expect(/^[A-Za-z0-9_-]+$/.test(token)).toBe(true);
    });

    it('generates unique tokens on each call', () => {
        expect(generateRefreshToken()).not.toBe(generateRefreshToken());
    });

    it('hashes a token deterministically and irreversibly', () => {
        const token = 'abc123';
        const hash = hashRefreshToken(token);
        expect(hash).toBe(hashRefreshToken(token));
        expect(hash.length).toBe(64); // SHA-256 hex
        expect(hash).not.toBe(token);
    });

    it('parses refresh TTL to milliseconds', () => {
        expect(getRefreshTokenTtlMs()).toBe(60 * 60 * 1000);
    });

    it('signs and verifies an access token', () => {
        const user = { id: 'u1', role: 'ADMIN', name: 'Ahmed' };
        const token = signAccessToken(user);
        expect(typeof token).toBe('string');

        const payload = verifyAccessToken(token);
        expect(payload.sub).toBe('u1');
        expect(payload.role).toBe('ADMIN');
        expect(payload.iss).toBe('shaheen-center-api');
        expect(payload.aud).toBe('shaheen-center-client');
        expect(payload.jti).toBeDefined();
        expect(payload.exp).toBeDefined();
        expect(payload.passwordHash).toBeUndefined();
    });
});
