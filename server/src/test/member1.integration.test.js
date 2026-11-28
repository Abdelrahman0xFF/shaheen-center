import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { prisma } from '../config/prisma.js';
import { resetDb, closeDb } from './integration/db.js';
import { makeBranch, makeUser, TEST_PASSWORD } from './integration/fixtures.js';

let adminToken;
let managerAToken;
let secretaryAToken;
let managerBToken;
let branchA;
let branchB;

async function login(phone) {
    const res = await request(app)
        .post('/api/auth/login')
        .send({ identifier: phone, password: TEST_PASSWORD });
    return res.body.data.accessToken;
}
async function loginWithPassword(phone, password) {
    const res = await request(app).post('/api/auth/login').send({ identifier: phone, password });
    return res.body.data.accessToken;
}

beforeAll(async () => {
    await resetDb();
});
afterAll(async () => {
    await closeDb();
});

beforeEach(async () => {
    await resetDb();
    branchA = await makeBranch('فرع أ');
    branchB = await makeBranch('فرع ب');

    const admin = await makeUser({ name: 'مدير', phone: '01000000000', role: 'ADMIN' });
    const managerA = await makeUser({
        name: 'مدير فرع أ',
        phone: '01011111111',
        role: 'BRANCH_MANAGER',
        branchIds: [branchA.id],
    });
    const secA = await makeUser({
        name: 'سكرتير أ',
        phone: '01022222222',
        role: 'SECRETARY',
        branchIds: [branchA.id],
    });
    const managerB = await makeUser({
        name: 'مدير فرع ب',
        phone: '01033333333',
        role: 'BRANCH_MANAGER',
        branchIds: [branchB.id],
    });

    adminToken = await login(admin.phone);
    managerAToken = await login(managerA.phone);
    secretaryAToken = await login(secA.phone);
    managerBToken = await login(managerB.phone);
});

const auth = (t) => ({ Authorization: `Bearer ${t}` });

// ---------------------------------------------------------------------------
// Branches & Rooms
// ---------------------------------------------------------------------------
describe('Branches & Rooms', () => {
    it('admin list/create/read/update branch', async () => {
        const list = await request(app).get('/api/branches').set(auth(adminToken));
        expect(list.status).toBe(200);
        expect(Array.isArray(list.body.data)).toBe(true);

        const created = await request(app)
            .post('/api/branches')
            .set(auth(adminToken))
            .send({ name: 'فرع ج', address: 'عنوان' });
        expect(created.status).toBe(201);
        const id = created.body.data.id;

        const read = await request(app).get(`/api/branches/${id}`).set(auth(adminToken));
        expect(read.status).toBe(200);

        const updated = await request(app)
            .patch(`/api/branches/${id}`)
            .set(auth(adminToken))
            .send({ address: 'جديد' });
        expect(updated.status).toBe(200);
        expect(updated.body.data.address).toBe('جديد');
    });

    it('duplicate branch name -> 409', async () => {
        const res = await request(app)
            .post('/api/branches')
            .set(auth(adminToken))
            .send({ name: 'فرع أ', address: 'x' });
        expect(res.status).toBe(409);
    });

    it('manager sees only assigned branches', async () => {
        const res = await request(app).get('/api/branches').set(auth(managerAToken));
        const ids = (res.body.data || []).map((b) => b.id);
        expect(ids).toContain(branchA.id);
        expect(ids).not.toContain(branchB.id);
    });

    it('manager cannot read other branch rooms -> 403', async () => {
        const res = await request(app)
            .get(`/api/branches/${branchB.id}/rooms`)
            .set(auth(managerAToken));
        expect(res.status).toBe(403);
    });

    it('secretary cannot create room -> 403', async () => {
        const res = await request(app)
            .post(`/api/branches/${branchA.id}/rooms`)
            .set(auth(secretaryAToken))
            .send({ name: 'ق', capacity: 10 });
        expect(res.status).toBe(403);
    });

    it('manager can create room in assigned branch', async () => {
        const res = await request(app)
            .post(`/api/branches/${branchA.id}/rooms`)
            .set(auth(managerAToken))
            .send({ name: 'قاعة 1', capacity: 20 });
        expect(res.status).toBe(201);
    });

    it('invalid capacity rejected', async () => {
        const res = await request(app)
            .post(`/api/branches/${branchA.id}/rooms`)
            .set(auth(adminToken))
            .send({ name: 'ق', capacity: 0 });
        expect(res.status).toBe(400);
    });

    it('duplicate room name in branch -> 409', async () => {
        await request(app)
            .post(`/api/branches/${branchA.id}/rooms`)
            .set(auth(adminToken))
            .send({ name: 'ق', capacity: 5 });
        const res = await request(app)
            .post(`/api/branches/${branchA.id}/rooms`)
            .set(auth(adminToken))
            .send({ name: 'ق', capacity: 5 });
        expect(res.status).toBe(409);
    });

    it('explicit foreign branchId -> 403', async () => {
        const res = await request(app)
            .get(`/api/branches/${branchB.id}/rooms`)
            .set(auth(managerAToken));
        expect(res.status).toBe(403);
    });

    it('protected active data blocks deactivation', async () => {
        // active student in branch A
        const parent = await prisma.parent.create({ data: { name: 'ولي', phone: '01099999999' } });
        await prisma.student.create({
            data: {
                name: 'طالب',
                phone: '01088888888',
                parentPhone: '01099999999',
                academicYear: '2026',
                branchId: branchA.id,
                parentId: parent.id,
                qrToken: 'qr-x',
            },
        });
        const res = await request(app)
            .patch(`/api/branches/${branchA.id}`)
            .set(auth(adminToken))
            .send({ isActive: false });
        expect(res.status).toBe(409);
    });
});

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------
describe('Staff', () => {
    it('admin can create Branch Manager + Secretary', async () => {
        const m = await request(app)
            .post('/api/staff')
            .set(auth(adminToken))
            .send({
                name: 'موظف',
                phone: '01012345678',
                password: 'StrongPass12345',
                role: 'BRANCH_MANAGER',
                branchIds: [branchA.id],
            });
        expect(m.status).toBe(201);
        const s = await request(app)
            .post('/api/staff')
            .set(auth(adminToken))
            .send({
                name: 'سكرتير',
                phone: '01012345679',
                password: 'StrongPass12345',
                role: 'SECRETARY',
                branchIds: [branchA.id],
            });
        expect(s.status).toBe(201);
        expect(JSON.stringify(s.body)).not.toContain('passwordHash');
    });

    it('duplicate phone rejected', async () => {
        await request(app)
            .post('/api/staff')
            .set(auth(adminToken))
            .send({
                name: 'موظف',
                phone: '01012345678',
                password: 'StrongPass12345',
                role: 'SECRETARY',
                branchIds: [branchA.id],
            });
        const res = await request(app)
            .post('/api/staff')
            .set(auth(adminToken))
            .send({
                name: 'موظف2',
                phone: '01012345678',
                password: 'StrongPass12345',
                role: 'SECRETARY',
                branchIds: [branchA.id],
            });
        expect(res.status).toBe(409);
    });

    it('unauthorized role cannot access staff -> 403', async () => {
        const res = await request(app).get('/api/staff').set(auth(secretaryAToken));
        expect(res.status).toBe(403);
    });

    it('update branch assignments + session revocation', async () => {
        const created = await request(app)
            .post('/api/staff')
            .set(auth(adminToken))
            .send({
                name: 'موظف',
                phone: '01012345678',
                password: 'StrongPass12345',
                role: 'SECRETARY',
                branchIds: [branchA.id],
            });
        const id = created.body.data.id;
        const token = await loginWithPassword('01012345678', 'StrongPass12345');

        const upd = await request(app)
            .patch(`/api/staff/${id}`)
            .set(auth(adminToken))
            .send({ branchIds: [branchB.id] });
        expect(upd.status).toBe(200);

        // old token invalidated (session revoked) -> /me should 401
        const me = await request(app).get('/api/auth/me').set(auth(token));
        expect(me.status).toBe(401);

        // a fresh login must carry the new tokenVersion and work again
        const freshToken = await loginWithPassword('01012345678', 'StrongPass12345');
        const freshMe = await request(app).get('/api/auth/me').set(auth(freshToken));
        expect(freshMe.status).toBe(200);
        expect(freshMe.body.data.branchIds).toEqual([branchB.id]);
    });

    it('reset password revokes sessions; no hash in response', async () => {
        const created = await request(app)
            .post('/api/staff')
            .set(auth(adminToken))
            .send({
                name: 'موظف',
                phone: '01012345678',
                password: 'StrongPass12345',
                role: 'SECRETARY',
                branchIds: [branchA.id],
            });
        const id = created.body.data.id;
        const token = await loginWithPassword('01012345678', 'StrongPass12345');

        const reset = await request(app)
            .post(`/api/staff/${id}/reset-password`)
            .set(auth(adminToken))
            .send({ newPassword: 'AnotherStrong123' });
        expect(reset.status).toBe(200);
        expect(JSON.stringify(reset.body)).not.toContain('passwordHash');

        const me = await request(app).get('/api/auth/me').set(auth(token));
        expect(me.status).toBe(401);

        // old password is rejected; the new password logs in successfully
        const oldLogin = await request(app)
            .post('/api/auth/login')
            .send({ identifier: '01012345678', password: 'StrongPass12345' });
        expect(oldLogin.status).toBe(401);

        const freshToken = await loginWithPassword('01012345678', 'AnotherStrong123');
        const freshMe = await request(app).get('/api/auth/me').set(auth(freshToken));
        expect(freshMe.status).toBe(200);
    });

    it('deactivation invalidates sessions and reactivation does not restore them', async () => {
        const created = await request(app)
            .post('/api/staff')
            .set(auth(adminToken))
            .send({
                name: 'موظف',
                phone: '01012345678',
                password: 'StrongPass12345',
                role: 'SECRETARY',
                branchIds: [branchA.id],
            });
        const id = created.body.data.id;
        const token = await loginWithPassword('01012345678', 'StrongPass12345');

        const res = await request(app)
            .patch(`/api/staff/${id}/status`)
            .set(auth(adminToken))
            .send({ isActive: false });
        expect(res.status).toBe(200);
        expect(res.body.data.isActive).toBe(false);

        const blocked = await request(app).get('/api/auth/me').set(auth(token));
        expect(blocked.status).toBe(401);

        const reactivated = await request(app)
            .patch(`/api/staff/${id}/status`)
            .set(auth(adminToken))
            .send({ isActive: true });
        expect(reactivated.status).toBe(200);

        // The pre-deactivation access token must stay invalid after reactivation.
        const stillBlocked = await request(app).get('/api/auth/me').set(auth(token));
        expect(stillBlocked.status).toBe(401);

        // A fresh login works after reactivation.
        const freshToken = await loginWithPassword('01012345678', 'StrongPass12345');
        const freshMe = await request(app).get('/api/auth/me').set(auth(freshToken));
        expect(freshMe.status).toBe(200);
    });
});

// ---------------------------------------------------------------------------
// Staff username = email address used for login
// ---------------------------------------------------------------------------
describe('Staff username email', () => {
    const validStaff = (overrides = {}) => ({
        name: 'Marco',
        phone: '01006664444',
        username: 'branch1@example.com',
        role: 'BRANCH_MANAGER',
        branchIds: [branchA.id],
        password: 'StrongPass12345',
        ...overrides,
    });

    it('staff creation with a valid email + password succeeds and logs in by email', async () => {
        const created = await request(app)
            .post('/api/staff')
            .set(auth(adminToken))
            .send(validStaff());
        expect(created.status).toBe(201);
        expect(created.body.data.username).toBe('branch1@example.com');
        expect(JSON.stringify(created.body)).not.toContain('passwordHash');

        // case + whitespace are normalized before comparing
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ identifier: '  Branch1@Example.com  ', password: 'StrongPass12345' });
        expect(loginRes.status).toBe(200);
        expect(loginRes.body.data.accessToken).toBeTruthy();
        expect(loginRes.body.data.user.username).toBe('branch1@example.com');

        const me = await request(app).get('/api/auth/me').set(auth(loginRes.body.data.accessToken));
        expect(me.status).toBe(200);

        const badPassword = await request(app)
            .post('/api/auth/login')
            .send({ identifier: 'branch1@example.com', password: 'wrong-password' });
        expect(badPassword.status).toBe(401);
    });

    it('leading/trailing whitespace in email is trimmed before saving', async () => {
        const created = await request(app)
            .post('/api/staff')
            .set(auth(adminToken))
            .send(validStaff({ username: '  branch1@Example.com  ' }));
        expect(created.status).toBe(201);
        expect(created.body.data.username).toBe('branch1@example.com');

        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ identifier: 'branch1@example.com', password: 'StrongPass12345' });
        expect(loginRes.status).toBe(200);
    });

    it('staff creation with an invalid email is rejected', async () => {
        for (const username of ['branch1', 'branch1@', '@example.com', 'not-an-email']) {
            const res = await request(app)
                .post('/api/staff')
                .set(auth(adminToken))
                .send(validStaff({ username }));
            expect(res.status, username).toBe(400);
            expect(res.body.error.code).toBe('VALIDATION_ERROR');
        }
    });

    it('omitted optional username is allowed; no email fabricated; cannot log in by email', async () => {
        const created = await request(app)
            .post('/api/staff')
            .set(auth(adminToken))
            .send(validStaff({ username: undefined, phone: '01006664445' }));
        expect(created.status).toBe(201);
        expect(created.body.data.username).toBeNull();

        const emailLogin = await request(app)
            .post('/api/auth/login')
            .send({ identifier: 'branch1@example.com', password: 'StrongPass12345' });
        expect(emailLogin.status).toBe(401);

        // no-email account can still use existing phone login, preserving account
        const phoneLogin = await request(app)
            .post('/api/auth/login')
            .send({ identifier: '01006664445', password: 'StrongPass12345' });
        expect(phoneLogin.status).toBe(200);
    });

    it('duplicate emails are rejected, including case-only differences', async () => {
        const first = await request(app)
            .post('/api/staff')
            .set(auth(adminToken))
            .send(validStaff());
        expect(first.status).toBe(201);

        const second = await request(app)
            .post('/api/staff')
            .set(auth(adminToken))
            .send(validStaff({ username: 'BRANCH1@example.com', phone: '01006664446' }));
        expect(second.status).toBe(409);
    });

    it('existing admin login continues to work', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ identifier: '01000000000', password: TEST_PASSWORD });
        expect(res.status).toBe(200);
        expect(res.body.data.accessToken).toBeTruthy();
    });
});

// ---------------------------------------------------------------------------
// Settings & Academic Calendar
// ---------------------------------------------------------------------------
describe('Settings & Calendar', () => {
    it('authenticated read settings; only admin update', async () => {
        const r1 = await request(app).get('/api/settings').set(auth(secretaryAToken));
        expect(r1.status).toBe(200);
        const upd = await request(app)
            .patch('/api/settings')
            .set(auth(secretaryAToken))
            .send({ center_name: 'x' });
        expect(upd.status).toBe(403);
    });

    it('settings allowlist rejects unsupported key', async () => {
        const res = await request(app)
            .patch('/api/settings')
            .set(auth(adminToken))
            .send({ hacked: true });
        expect(res.status).toBe(400);
    });

    it('currency cannot be changed', async () => {
        const res = await request(app)
            .patch('/api/settings')
            .set(auth(adminToken))
            .send({ currency: 'USD' });
        expect(res.status).toBe(400);
    });

    it('term create/update + one-active-term rule', async () => {
        const t1 = await request(app).post('/api/settings/terms').set(auth(adminToken)).send({
            name: 'فصل 1',
            year: '2026',
            startDate: '2026-09-01',
            endDate: '2027-01-01',
            isActive: true,
        });
        expect(t1.status).toBe(201);
        const t2 = await request(app).post('/api/settings/terms').set(auth(adminToken)).send({
            name: 'فصل 2',
            year: '2026',
            startDate: '2026-09-01',
            endDate: '2027-01-01',
            isActive: true,
        });
        expect(t2.status).toBe(409);
        const upd = await request(app)
            .patch(`/api/settings/terms/${t1.body.data.id}`)
            .set(auth(adminToken))
            .send({ name: 'فصل محدث' });
        expect(upd.status).toBe(200);
    });

    it('invalid term dates rejected', async () => {
        const res = await request(app)
            .post('/api/settings/terms')
            .set(auth(adminToken))
            .send({ name: 'x', year: '2026', startDate: '2027-01-01', endDate: '2026-01-01' });
        expect(res.status).toBe(400);
    });

    it('holiday CRUD + duplicate + invalid date', async () => {
        const created = await request(app)
            .post('/api/settings/holidays')
            .set(auth(adminToken))
            .send({ name: 'عيد', date: '2026-12-25' });
        expect(created.status).toBe(201);
        const id = created.body.data.id;

        const dup = await request(app)
            .post('/api/settings/holidays')
            .set(auth(adminToken))
            .send({ name: 'عيد', date: '2026-12-25' });
        expect(dup.status).toBe(409);

        const bad = await request(app)
            .post('/api/settings/holidays')
            .set(auth(adminToken))
            .send({ name: 'x', date: 'not-a-date' });
        expect(bad.status).toBe(400);

        const list = await request(app).get('/api/settings/holidays').set(auth(adminToken));
        expect(list.status).toBe(200);

        const upd = await request(app)
            .patch(`/api/settings/holidays/${id}`)
            .set(auth(adminToken))
            .send({ name: 'عيد محدث' });
        expect(upd.status).toBe(200);

        const del = await request(app).delete(`/api/settings/holidays/${id}`).set(auth(adminToken));
        expect(del.status).toBe(200);
    });

    it('terms/holidays read roles exclude STUDENT', async () => {
        const student = await makeUser({ name: 'طالب', phone: '01077777777', role: 'STUDENT' });
        const token = await login(student.phone);
        const res = await request(app).get('/api/settings/terms').set(auth(token));
        expect(res.status).toBe(403);
    });
});

// ---------------------------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------------------------
describe('Audit Logs', () => {
    it('admin can list + filter; non-admin 403; no secrets', async () => {
        await request(app)
            .post('/api/branches')
            .set(auth(adminToken))
            .send({ name: 'فرع ج', address: 'x' });

        const list = await request(app)
            .get('/api/settings/audit-logs')
            .set(auth(adminToken))
            .query({ entity: 'Branch', action: 'BRANCH_CREATED' });
        expect(list.status).toBe(200);
        expect((list.body.data || []).length).toBeGreaterThan(0);
        const blob = JSON.stringify(list.body);
        expect(blob).not.toContain('passwordHash');
        expect(blob.toLowerCase()).not.toContain('nationalid');

        const forbidden = await request(app)
            .get('/api/settings/audit-logs')
            .set(auth(managerAToken));
        expect(forbidden.status).toBe(403);
    });

    it('sensitive create generates audit entry', async () => {
        await request(app)
            .post('/api/staff')
            .set(auth(adminToken))
            .send({
                name: 'موظف',
                phone: '01012345678',
                password: 'StrongPass12345',
                role: 'SECRETARY',
                branchIds: [branchA.id],
            });
        const count = await prisma.auditLog.count({ where: { action: 'STAFF_CREATED' } });
        expect(count).toBeGreaterThan(0);
    });
});

// ---------------------------------------------------------------------------
// Branch isolation across two branches
// ---------------------------------------------------------------------------
describe('Branch isolation', () => {
    it('manager B cannot access branch A protected records', async () => {
        await request(app)
            .post(`/api/branches/${branchA.id}/rooms`)
            .set(auth(adminToken))
            .send({ name: 'ق', capacity: 5 });
        const res = await request(app)
            .get(`/api/branches/${branchA.id}/rooms`)
            .set(auth(managerBToken));
        expect(res.status).toBe(403);
    });

    it('scoped list returns only permitted records', async () => {
        const res = await request(app).get('/api/branches').set(auth(managerBToken));
        const ids = (res.body.data || []).map((b) => b.id);
        expect(ids).not.toContain(branchA.id);
    });
});
