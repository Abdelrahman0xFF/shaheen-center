import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { env } from '../config/env.js';
import { makeUser, TEST_PASSWORD } from './integration/fixtures.js';
import { closeDb } from './integration/db.js';

const ORIGIN = env.trustedOrigins[0] || 'http://localhost:5173';
const COOKIE_NAME = env.refreshCookieName;
const PHONE = '01099990000';

function extractCookie(setCookie, name) {
    const list = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    for (const entry of list) {
        const pair = String(entry).split(';')[0].trim();
        if (pair.startsWith(`${name}=`)) return pair;
    }
    return null;
}

function cookieValue(setCookie, name) {
    const pair = extractCookie(setCookie, name);
    return pair ? pair.slice(name.length + 1) : null;
}

function cookieCleared(setCookie, name) {
    const list = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    return list.some((entry) => {
        const e = String(entry);
        return e.startsWith(`${name}=`) && /max-age=0|expires=Thu, 01 Jan 1970/i.test(e);
    });
}

let user;
let loginCookie;

beforeAll(async () => {
    user = await makeUser({ name: 'مدير', phone: PHONE, role: 'ADMIN', password: TEST_PASSWORD });
    const login = await request(app)
        .post('/api/auth/login')
        .send({ identifier: PHONE, password: TEST_PASSWORD });
    expect(login.status).toBe(200);
    loginCookie = extractCookie(login.headers['set-cookie'], COOKIE_NAME);
    expect(loginCookie).toBeTruthy();
});

afterAll(async () => {
    await closeDb();
});

describe('POST /api/auth/refresh JSON contract', () => {
    it('accepts a valid refresh cookie with an empty {} body and rotates the token', async () => {
        const originalToken = cookieValue([loginCookie], COOKIE_NAME);
        expect(originalToken).toBeTruthy();

        const res = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', loginCookie)
            .set('Origin', ORIGIN)
            .set('Content-Type', 'application/json')
            .send({});

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.accessToken).toBeTruthy();

        // A replacement cookie is set for the rotated session.
        const rotated = extractCookie(res.headers['set-cookie'], COOKIE_NAME);
        expect(rotated).toBeTruthy();
        const rotatedValue = rotated.slice(COOKIE_NAME.length + 1);
        expect(rotatedValue).not.toBe(originalToken);

        // The old refresh token is no longer accepted.
        const replay = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', loginCookie)
            .set('Origin', ORIGIN)
            .set('Content-Type', 'application/json')
            .send({});
        expect(replay.status).toBe(401);
        expect([
            'REFRESH_RACE',
            'INVALID_REFRESH_TOKEN',
            'REFRESH_TOKEN_REPLAY_DETECTED',
        ]).toContain(replay.body.error.code);
        // A failed replay must not clear a valid replacement cookie.
        expect(cookieCleared(replay.headers['set-cookie'], COOKIE_NAME)).toBe(false);

        // The rotated replacement cookie still works.
        const next = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', rotated)
            .set('Origin', ORIGIN)
            .set('Content-Type', 'application/json')
            .send({});
        expect(next.status).toBe(200);
        expect(next.body.data.accessToken).toBeTruthy();
    });

    it('rejects invalid JSON with 400 INVALID_JSON and does not clear the cookie', async () => {
        const cookie = extractCookie(
            (
                await request(app)
                    .post('/api/auth/login')
                    .send({ identifier: PHONE, password: TEST_PASSWORD })
            ).headers['set-cookie'],
            COOKIE_NAME,
        );
        expect(cookie).toBeTruthy();

        const res = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', cookie)
            .set('Origin', ORIGIN)
            .set('Content-Type', 'application/json')
            .set('Content-Length', '4')
            .send('null');

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('INVALID_JSON');
        // No clearing of a still-valid replacement/session cookie.
        expect(cookieCleared(res.headers['set-cookie'], COOKIE_NAME)).toBe(false);

        // The session is still valid with a proper empty object body.
        const recovered = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', cookie)
            .set('Origin', ORIGIN)
            .set('Content-Type', 'application/json')
            .send({});
        expect(recovered.status).toBe(200);
    });
});
