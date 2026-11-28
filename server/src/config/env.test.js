import { describe, it, expect, vi } from 'vitest';

const BASE = {
    NODE_ENV: 'test',
    PORT: '5000',
    DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
    JWT_SECRET: 'x'.repeat(32),
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    ENCRYPTION_KEY: 'a'.repeat(64),
    BLIND_INDEX_SECRET: 'y'.repeat(32),
    CLIENT_URL: 'http://localhost:5173',
    TRUSTED_ORIGINS: '',
    NOTIFICATION_MODE: 'MOCK',
    REFRESH_SESSION_MAX_DAYS: '30',
    AUTH_MAX_FAILED_ATTEMPTS: '5',
    AUTH_LOCKOUT_MINUTES: '15',
    LOGIN_RATE_LIMIT_WINDOW_MS: '900000',
    LOGIN_RATE_LIMIT_MAX: '20',
    REFRESH_RATE_LIMIT_WINDOW_MS: '900000',
    REFRESH_RATE_LIMIT_MAX: '120',
    REFRESH_COOKIE_NAME: 'shaheen_refresh_token',
    REFRESH_COOKIE_PATH: '/api/auth',
    REFRESH_COOKIE_SAMESITE: 'lax',
};

async function loadValidate(envOverrides) {
    vi.resetModules();
    for (const k of Object.keys(process.env))
        if (k in BASE || k in (envOverrides || {})) delete process.env[k];
    Object.assign(process.env, BASE, envOverrides);
    const mod = await import('./env.js');
    return mod.validateEnv;
}

describe('validateEnv', () => {
    it('valid config passes', async () => {
        const v = await loadValidate();
        expect(() => v()).not.toThrow();
    });
    it('missing DATABASE_URL fails', async () => {
        const v = await loadValidate({ DATABASE_URL: '' });
        expect(() => v()).toThrow(/DATABASE_URL/);
    });
    it('bad ENCRYPTION_KEY fails', async () => {
        const v = await loadValidate({ ENCRYPTION_KEY: 'abc' });
        expect(() => v()).toThrow(/ENCRYPTION_KEY/);
    });
    it('wildcard trusted origin fails', async () => {
        const v = await loadValidate({ TRUSTED_ORIGINS: '*' });
        expect(() => v()).toThrow(/TRUSTED_ORIGINS|wildcard/i);
    });
    it('aggregates multiple errors', async () => {
        const v = await loadValidate({ DATABASE_URL: '', ENCRYPTION_KEY: 'x' });
        try {
            v();
            throw new Error('should have thrown');
        } catch (e) {
            expect(e.message.split('\n').length).toBeGreaterThan(2);
        }
    });
    it('no secret values in message', async () => {
        const v = await loadValidate({
            JWT_SECRET: 'supersecretvalue',
            NODE_ENV: 'production',
            ENCRYPTION_KEY: 'x',
            DATABASE_URL: 'postgresql://u:p@h/d',
            CLIENT_URL: 'http://x',
            BLIND_INDEX_SECRET: '',
        });
        try {
            v();
        } catch (e) {
            expect(e.message).not.toContain('supersecretvalue');
        }
    });
    it('REFRESH_COOKIE_SAMESITE=none requires production', async () => {
        const v = await loadValidate({ REFRESH_COOKIE_SAMESITE: 'none', NODE_ENV: 'test' });
        expect(() => v()).toThrow(/SameSite|production/i);
    });
});
