import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { authenticate } from './authenticate.js';

const prismaMock = vi.hoisted(() => ({
    user: { findUnique: vi.fn() },
}));

vi.mock('../config/prisma.js', () => ({ prisma: prismaMock }));

const JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';

function signToken(payload) {
    return jwt.sign(payload, JWT_SECRET, {
        algorithm: 'HS256',
        issuer: 'shaheen-center-api',
        audience: 'shaheen-center-client',
        expiresIn: '15m',
    });
}

function makeReq(token) {
    return {
        headers: token ? { authorization: `Bearer ${token}` } : {},
    };
}

function makeNext() {
    return vi.fn();
}

describe('authenticate middleware', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('rejects missing Authorization header with 401', async () => {
        const req = makeReq(null);
        const next = makeNext();

        await authenticate(req, null, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 401, code: 'UNAUTHORIZED' }),
        );
    });

    it('rejects malformed header with 401', async () => {
        const req = { headers: { authorization: 'Token abc' } };
        const next = makeNext();

        await authenticate(req, null, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 401, code: 'UNAUTHORIZED' }),
        );
    });

    it('rejects inactive user with 401', async () => {
        prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', isActive: false });
        const req = makeReq(signToken({ sub: 'u1', tokenVersion: 0 }));
        const next = makeNext();

        await authenticate(req, null, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 401, code: 'ACCOUNT_INACTIVE' }),
        );
    });

    it('attaches safe req.user and calls next for active user', async () => {
        const user = {
            id: 'u1',
            role: 'SECRETARY',
            name: 'أحمد',
            phone: '01012345678',
            isActive: true,
            tokenVersion: 0,
            branches: [{ branchId: 'branch-1' }],
        };
        prismaMock.user.findUnique.mockResolvedValue(user);

        const req = makeReq(signToken({ sub: 'u1', tokenVersion: 0 }));
        const next = makeNext();

        await authenticate(req, null, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.user).toEqual({
            id: 'u1',
            role: 'SECRETARY',
            name: 'أحمد',
            phone: '01012345678',
            username: undefined,
            isActive: true,
            branchIds: ['branch-1'],
            instructorProfile: null,
            studentProfile: null,
            instructorId: null,
            studentId: null,
        });
        expect(req.user.passwordHash).toBeUndefined();
    });

    it('rejects a token missing the tokenVersion claim', async () => {
        prismaMock.user.findUnique.mockResolvedValue({
            id: 'u1',
            role: 'SECRETARY',
            isActive: true,
            tokenVersion: 0,
            branches: [],
        });
        const req = makeReq(signToken({ sub: 'u1' }));
        const next = makeNext();

        await authenticate(req, null, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 401, code: 'INVALID_TOKEN' }),
        );
    });

    it('rejects a malformed tokenVersion claim', async () => {
        prismaMock.user.findUnique.mockResolvedValue({
            id: 'u1',
            role: 'SECRETARY',
            isActive: true,
            tokenVersion: 0,
            branches: [],
        });
        const req = makeReq(signToken({ sub: 'u1', tokenVersion: '0' }));
        const next = makeNext();

        await authenticate(req, null, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 401, code: 'INVALID_TOKEN' }),
        );
    });

    it('rejects a token whose tokenVersion is stale (revoked session)', async () => {
        prismaMock.user.findUnique.mockResolvedValue({
            id: 'u1',
            role: 'SECRETARY',
            isActive: true,
            tokenVersion: 3,
            branches: [],
        });
        const req = makeReq(signToken({ sub: 'u1', tokenVersion: 2 }));
        const next = makeNext();

        await authenticate(req, null, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 401, code: 'TOKEN_REVOKED' }),
        );
    });

    it('accepts a token matching the current tokenVersion', async () => {
        prismaMock.user.findUnique.mockResolvedValue({
            id: 'u1',
            role: 'SECRETARY',
            isActive: true,
            tokenVersion: 3,
            branches: [],
        });
        const req = makeReq(signToken({ sub: 'u1', tokenVersion: 3 }));
        const next = makeNext();

        await authenticate(req, null, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0]).toHaveLength(0);
    });

    it('exposes instructor/student profile ids for ownership filters', async () => {
        prismaMock.user.findUnique.mockResolvedValue({
            id: 'u1',
            role: 'INSTRUCTOR',
            name: 'مدرس',
            phone: '01012345678',
            isActive: true,
            tokenVersion: 0,
            branches: [],
            instructorProfile: { id: 'instructor-1' },
            studentProfile: null,
        });
        const req = makeReq(signToken({ sub: 'u1', tokenVersion: 0 }));
        const next = makeNext();

        await authenticate(req, null, next);

        expect(req.user.instructorId).toBe('instructor-1');
        expect(req.user.studentId).toBeNull();
    });
});
