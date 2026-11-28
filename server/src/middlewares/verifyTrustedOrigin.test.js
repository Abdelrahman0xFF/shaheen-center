import { describe, it, expect, vi } from 'vitest';

vi.mock('../config/env.js', () => ({
    env: {
        trustedOrigins: ['http://localhost:5173', 'https://app.example.com'],
        refreshCookieName: 'shaheen_refresh_token',
    },
}));

const { verifyTrustedOrigin, verifyTrustedOriginForCookie } =
    await import('./verifyTrustedOrigin.js');

function run(mw, req) {
    const next = vi.fn();
    mw(req, {}, next);
    return next;
}

describe('verifyTrustedOrigin', () => {
    it('safe methods bypass', () => {
        expect(
            run(verifyTrustedOrigin, { method: 'GET', headers: { origin: 'http://evil.com' } }),
        ).toHaveBeenCalledWith();
    });

    it('allows trusted origin', () => {
        const next = run(verifyTrustedOrigin, {
            method: 'POST',
            headers: { origin: 'http://localhost:5173' },
        });
        expect(next).toHaveBeenCalledWith();
    });

    it('rejects disallowed origin', () => {
        const next = run(verifyTrustedOrigin, {
            method: 'POST',
            headers: { origin: 'http://evil.com' },
        });
        expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403, code: 'UNTRUSTED_ORIGIN' });
    });

    it('rejects Origin: null', () => {
        const next = run(verifyTrustedOrigin, { method: 'POST', headers: { origin: 'null' } });
        expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403 });
    });

    it('rejects Sec-Fetch-Site: cross-site', () => {
        const next = run(verifyTrustedOrigin, {
            method: 'POST',
            headers: { 'sec-fetch-site': 'cross-site', origin: 'http://localhost:5173' },
        });
        expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403, code: 'UNTRUSTED_ORIGIN' });
    });

    it('referer fallback to trusted origin', () => {
        const next = run(verifyTrustedOrigin, {
            method: 'POST',
            headers: { referer: 'http://localhost:5173/page' },
        });
        expect(next).toHaveBeenCalledWith();
    });

    it('allows missing origin without cookie (CLI)', () => {
        const next = run(verifyTrustedOrigin, { method: 'POST', headers: {} });
        expect(next).toHaveBeenCalledWith();
    });

    it('cookie-auth route requires origin when neither header present', () => {
        const next = run(verifyTrustedOriginForCookie, {
            method: 'POST',
            headers: {},
            cookies: { shaheen_refresh_token: 'x' },
        });
        expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403, code: 'ORIGIN_REQUIRED' });
    });
});
