import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { resetDb, closeDb } from './integration/db.js';
import { makeBranch, makeUser, TEST_PASSWORD } from './integration/fixtures.js';

describe('integration: health + auth + RBAC', () => {
    beforeAll(async () => {
        await resetDb();
    });
    afterAll(async () => {
        await closeDb();
    });
    beforeEach(async () => {
        await resetDb();
    });

    it('health returns 200', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('login success for ADMIN; no secrets in JSON; sets HttpOnly cookie', async () => {
        await makeBranch('الفرع الرئيسي');
        await makeUser({ name: 'مدير', phone: '01000000000', role: 'ADMIN' });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ identifier: '01000000000', password: TEST_PASSWORD });

        expect(res.status).toBe(200);
        expect(res.body.data.accessToken).toBeTruthy();
        expect(JSON.stringify(res.body)).not.toContain('passwordHash');
        expect(JSON.stringify(res.body)).not.toContain('refreshToken');
        const cookie = res.headers['set-cookie']?.join(';') || '';
        expect(cookie).toMatch(/HttpOnly/i);
        expect(cookie).toMatch(/Path=\/api\/auth/i);
    });

    it('wrong password -> 401 generic', async () => {
        await makeUser({ name: 'مدير', phone: '01000000000', role: 'ADMIN' });
        const res = await request(app)
            .post('/api/auth/login')
            .send({ identifier: '01000000000', password: 'WrongPass12345' });
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('secretary cannot access /api/staff -> 403', async () => {
        const branch = await makeBranch('فرع أ');
        const sec = await makeUser({
            name: 'سكرتير',
            phone: '01011111111',
            role: 'SECRETARY',
            branchIds: [branch.id],
        });

        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ identifier: '01011111111', password: TEST_PASSWORD });
        const token = loginRes.body.data.accessToken;

        const res = await request(app).get('/api/staff').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
    });

    it('manager foreign branch -> 403 on rooms', async () => {
        const a = await makeBranch('فرع أ');
        const b = await makeBranch('فرع ب');
        const mgr = await makeUser({
            name: 'مدير فرع',
            phone: '01022222222',
            role: 'BRANCH_MANAGER',
            branchIds: [a.id],
        });

        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ identifier: '01022222222', password: TEST_PASSWORD });
        const token = loginRes.body.data.accessToken;

        const res = await request(app)
            .get(`/api/branches/${b.id}/rooms`)
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
    });

    it('unknown route -> 404, no query echo', async () => {
        const res = await request(app).get('/api/nope?secret=abc');
        expect(res.status).toBe(404);
        expect(JSON.stringify(res.body)).not.toContain('secret=abc');
    });

    it('X-Request-Id header present', async () => {
        const res = await request(app).get('/api/health');
        expect(res.headers['x-request-id']).toBeTruthy();
    });
});
