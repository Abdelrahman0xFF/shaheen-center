import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import * as authService from './auth.service.js';

const prismaMock = vi.hoisted(() => ({
    user: {
        findFirst: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
    },
    refreshToken: {
        findUnique: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn(prismaMock)),
}));

const verifyPasswordMock = vi.hoisted(() => vi.fn());
const logAuditMock = vi.hoisted(() => vi.fn(async (data) => data));

vi.mock('../config/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../utils/password.js', () => ({
    MAX_PASSWORD_BYTES: 72,
    DUMMY_PASSWORD_HASH: '$2b$12$dummy.hash.for.unknown.accounts.only',
    verifyPassword: verifyPasswordMock,
    passwordByteLength: (password) => Buffer.byteLength(String(password ?? ''), 'utf8'),
    isPasswordWithinBcryptLimit: (password) =>
        Buffer.byteLength(String(password ?? ''), 'utf8') <= 72,
}));
vi.mock('../utils/auditLogger.js', () => ({
    logAudit: logAuditMock,
}));

const now = new Date('2026-01-01T12:00:00.000Z');

function adminUser(overrides = {}) {
    return {
        id: 'user-admin-1',
        role: 'ADMIN',
        name: 'أحمد المدير',
        phone: '01012345678',
        username: 'admin',
        passwordHash: '$2b$12$hashplaceholder',
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        branches: [{ branchId: 'branch-1' }],
        instructorProfile: null,
        studentProfile: null,
        ...overrides,
    };
}

const baseMeta = { ipAddress: '127.0.0.1', userAgent: 'test-agent' };

function setClock(ms) {
    vi.setSystemTime(new Date(ms));
    now.setTime(ms);
}

beforeEach(() => {
    vi.useFakeTimers();
    setClock(now.getTime());
    vi.clearAllMocks();

    verifyPasswordMock.mockResolvedValue(false);
    logAuditMock.mockResolvedValue({});

    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.update.mockResolvedValue({ failedLoginAttempts: 1 });
    prismaMock.user.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.refreshToken.findUnique.mockResolvedValue(null);
    prismaMock.refreshToken.create.mockResolvedValue({});
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.$transaction.mockImplementation((fn) => fn(prismaMock));
});

afterEach(() => {
    vi.useRealTimers();
});

describe('auth.service.login', () => {
    it('logs in an admin successfully and resets failed attempts', async () => {
        const user = adminUser();
        prismaMock.user.findFirst.mockResolvedValue(user);
        verifyPasswordMock.mockResolvedValue(true);

        const result = await authService.login({
            identifier: '01012345678',
            password: 'Secret123456!',
            ...baseMeta,
        });

        expect(result.accessToken).toBeDefined();
        expect(result.refreshToken).toBeDefined();
        expect(result.user.passwordHash).toBeUndefined();
        expect(result.user.role).toBe('ADMIN');
        expect(result.user.branchIds).toEqual(['branch-1']);

        expect(prismaMock.user.update).toHaveBeenCalledWith({
            where: { id: 'user-admin-1' },
            data: { failedLoginAttempts: 0, lockedUntil: null },
        });
        expect(prismaMock.refreshToken.create).toHaveBeenCalled();
    });

    it('logs in staff by email (username) and password, normalising email case', async () => {
        const user = adminUser({
            role: 'BRANCH_MANAGER',
            phone: '01006664444',
            username: 'branch1@example.com',
            tokenVersion: 0,
        });
        prismaMock.user.findFirst.mockResolvedValue(user);
        verifyPasswordMock.mockResolvedValue(true);

        const result = await authService.login({
            identifier: '  Branch1@Example.com  ',
            password: 'A_VALID_TEST_PASSWORD',
            ...baseMeta,
        });

        expect(result.accessToken).toBeDefined();
        expect(result.user.username).toBe('branch1@example.com');
        expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    OR: [
                        { phone: 'branch1@example.com' },
                        { username: { equals: 'branch1@example.com', mode: 'insensitive' } },
                    ],
                },
            }),
        );
        expect(verifyPasswordMock).toHaveBeenCalledWith(
            'A_VALID_TEST_PASSWORD',
            '$2b$12$hashplaceholder',
        );
    });

    it('rejects incorrect password for email login generically', async () => {
        const user = adminUser({ username: 'branch1@example.com', role: 'BRANCH_MANAGER' });
        prismaMock.user.findFirst.mockResolvedValue(user);
        verifyPasswordMock.mockResolvedValue(false);

        await expect(
            authService.login({
                identifier: 'branch1@example.com',
                password: 'wrong-password',
                ...baseMeta,
            }),
        ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', statusCode: 401 });
    });

    it('rejects wrong password generically', async () => {
        const user = adminUser();
        prismaMock.user.findFirst.mockResolvedValue(user);
        verifyPasswordMock.mockResolvedValue(false);

        await expect(
            authService.login({
                identifier: '01012345678',
                password: 'WrongPassword!',
                ...baseMeta,
            }),
        ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', statusCode: 401 });

        expect(prismaMock.user.update).toHaveBeenCalledWith({
            where: { id: 'user-admin-1' },
            data: { failedLoginAttempts: { increment: 1 } },
            select: { failedLoginAttempts: true },
        });
    });

    it('rejects unknown phone generically without leaking existence', async () => {
        prismaMock.user.findFirst.mockResolvedValue(null);

        await expect(
            authService.login({
                identifier: '01000000000',
                password: 'AnyPassword!',
                ...baseMeta,
            }),
        ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', statusCode: 401 });

        expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('rejects inactive accounts', async () => {
        const user = adminUser({ isActive: false });
        prismaMock.user.findFirst.mockResolvedValue(user);
        verifyPasswordMock.mockResolvedValue(true);

        await expect(
            authService.login({
                identifier: '01012345678',
                password: 'Secret123456!',
                ...baseMeta,
            }),
        ).rejects.toMatchObject({ code: 'ACCOUNT_INACTIVE', statusCode: 403 });
    });

    it('locks account after max failed attempts', async () => {
        const user = adminUser({ failedLoginAttempts: 4 });
        prismaMock.user.findFirst.mockResolvedValue(user);
        verifyPasswordMock.mockResolvedValue(false);
        prismaMock.user.update.mockResolvedValue({ failedLoginAttempts: 5 });

        await expect(
            authService.login({
                identifier: '01012345678',
                password: 'WrongPassword!',
                ...baseMeta,
            }),
        ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });

        expect(prismaMock.user.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    id: 'user-admin-1',
                    OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
                },
            }),
        );
    });

    it('rejects a correct password while locked', async () => {
        const user = adminUser({
            lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
        });
        prismaMock.user.findFirst.mockResolvedValue(user);
        verifyPasswordMock.mockResolvedValue(true);

        await expect(
            authService.login({
                identifier: '01012345678',
                password: 'Secret123456!',
                ...baseMeta,
            }),
        ).rejects.toMatchObject({ code: 'ACCOUNT_LOCKED', statusCode: 423 });
    });

    it('logs audit on success', async () => {
        const user = adminUser();
        prismaMock.user.findFirst.mockResolvedValue(user);
        verifyPasswordMock.mockResolvedValue(true);

        await authService.login({
            identifier: '01012345678',
            password: 'Secret123456!',
            ...baseMeta,
        });

        expect(logAuditMock).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'LOGIN_SUCCESS',
                entity: 'User',
                entityId: 'user-admin-1',
                userId: 'user-admin-1',
            }),
        );
    });

    it('signs the current database tokenVersion so a bumped account can log in again', async () => {
        const user = adminUser({ tokenVersion: 4 });
        prismaMock.user.findFirst.mockResolvedValue(user);
        verifyPasswordMock.mockResolvedValue(true);

        const result = await authService.login({
            identifier: '01012345678',
            password: 'Secret123456!',
            ...baseMeta,
        });

        const payload = jwt.decode(result.accessToken);
        expect(payload.tokenVersion).toBe(4);
        expect(result.user.tokenVersion).toBeUndefined();
    });
});

describe('auth.service.refresh', () => {
    const storedToken = {
        id: 'rt-1',
        userId: 'user-admin-1',
        familyId: 'family-1',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        revokedAt: null,
        user: adminUser(),
    };

    it('rotates a valid refresh token', async () => {
        prismaMock.refreshToken.findUnique.mockResolvedValue(storedToken);
        prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });

        const result = await authService.refresh({
            refreshToken: 'raw-token',
            ...baseMeta,
        });

        expect(result.accessToken).toBeDefined();
        expect(result.refreshToken).toBeDefined();
        expect(prismaMock.refreshToken.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    familyId: 'family-1',
                    userId: 'user-admin-1',
                }),
            }),
        );
    });

    it('signs the current database tokenVersion during rotation', async () => {
        prismaMock.refreshToken.findUnique.mockResolvedValue({
            ...storedToken,
            user: adminUser({ tokenVersion: 7 }),
        });
        prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });

        const result = await authService.refresh({
            refreshToken: 'raw-token',
            ...baseMeta,
        });

        const payload = jwt.decode(result.accessToken);
        expect(payload.tokenVersion).toBe(7);
    });

    it('rejects expired refresh tokens', async () => {
        prismaMock.refreshToken.findUnique.mockResolvedValue({
            ...storedToken,
            expiresAt: new Date(Date.now() - 60 * 60 * 1000),
        });

        await expect(
            authService.refresh({ refreshToken: 'raw-token', ...baseMeta }),
        ).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN', statusCode: 401 });
    });

    it('revokes the whole family on replay of a revoked token', async () => {
        prismaMock.refreshToken.findUnique.mockResolvedValue({
            ...storedToken,
            revokedAt: new Date(Date.now() - 60 * 1000),
        });

        await expect(
            authService.refresh({ refreshToken: 'raw-token', ...baseMeta }),
        ).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' });

        expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ familyId: 'family-1' }),
            }),
        );
    });

    it('rejects unknown refresh tokens without revealing existence', async () => {
        prismaMock.refreshToken.findUnique.mockResolvedValue(null);

        await expect(
            authService.refresh({ refreshToken: 'unknown', ...baseMeta }),
        ).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN', statusCode: 401 });
    });
});

describe('auth.service.logout and logoutAll', () => {
    it('revokes current session on logout', async () => {
        prismaMock.refreshToken.findUnique.mockResolvedValue({
            userId: 'user-admin-1',
            familyId: 'family-1',
        });
        prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });

        const result = await authService.logout({
            refreshToken: 'raw-token',
            ...baseMeta,
        });

        expect(result.revoked).toBe(true);
    });

    it('revokes all sessions on logout-all', async () => {
        prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 3 });

        const result = await authService.logoutAll('user-admin-1', { ...baseMeta });

        expect(result.revokedSessions).toBe(3);
        expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
            where: { userId: 'user-admin-1', revokedAt: null },
            data: { revokedAt: expect.any(Date) },
        });
    });
});
