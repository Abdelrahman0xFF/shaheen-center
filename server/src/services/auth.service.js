import crypto from 'crypto';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { logAudit } from '../utils/auditLogger.js';
import { DUMMY_PASSWORD_HASH, verifyPassword } from '../utils/password.js';
import {
    generateRefreshToken,
    getRefreshTokenTtlMs,
    hashRefreshToken,
    signAccessToken,
} from '../utils/token.js';
import { normalizeLoginIdentifier } from '../validators/auth.validator.js';

const SAFE_USER_SELECT = {
    id: true,
    role: true,
    name: true,
    phone: true,
    username: true,
    isActive: true,
    // Required so login/refresh sign the current version, not a stale 0.
    tokenVersion: true,
    branches: {
        select: {
            branchId: true,
            branch: { select: { id: true, name: true } },
        },
    },
    instructorProfile: { select: { id: true } },
    studentProfile: { select: { id: true } },
};

const LOGIN_USER_SELECT = {
    ...SAFE_USER_SELECT,
    passwordHash: true,
    failedLoginAttempts: true,
    lockedUntil: true,
};

function invalidCredentials() {
    return new ApiError(
        401,
        'رقم الموبايل أو البريد الإلكتروني أو كلمة المرور غير صحيحة',
        'INVALID_CREDENTIALS',
    );
}

function invalidRefreshToken() {
    return new ApiError(401, 'جلسة الدخول منتهية أو غير صالحة', 'INVALID_REFRESH_TOKEN');
}

/**
 * Converts a Prisma user row into the only shape allowed to leave the API.
 * passwordHash, refreshTokenHash, and every other credential field are dropped.
 */
export function sanitizeUser(user) {
    if (!user) return null;

    const branches = user.branches || [];

    return {
        id: user.id,
        name: user.name,
        phone: user.phone,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        branchIds: branches.map((item) => item.branchId),
        branches: branches.map((item) => item.branch).filter(Boolean),
        instructorId: user.instructorProfile?.id || null,
        studentId: user.studentProfile?.id || null,
    };
}

async function findUserForLogin(identifier) {
    const normalizedIdentifier = normalizeLoginIdentifier(identifier);

    return prisma.user.findFirst({
        where: {
            OR: [
                { phone: normalizedIdentifier },
                // `username` stores a staff email; normalize + match case-insensitively.
                { username: { equals: normalizedIdentifier, mode: 'insensitive' } },
            ],
        },
        select: LOGIN_USER_SELECT,
    });
}

/**
 * Atomically increments the failure counter. The lock is only written when it
 * would extend an expired/absent lock, so concurrent failures cannot shorten
 * an existing lockout.
 */
async function registerFailedLogin(user, now, ipAddress) {
    const updated = await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: { increment: 1 } },
        select: { failedLoginAttempts: true },
    });

    const attempts = updated?.failedLoginAttempts ?? 1;
    if (attempts < env.loginMaxFailedAttempts) return;

    const lockedUntil = new Date(now.getTime() + env.loginLockoutMinutes * 60 * 1000);

    const lockResult = await prisma.user.updateMany({
        where: {
            id: user.id,
            OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
        },
        data: { lockedUntil },
    });

    if (lockResult?.count) {
        await logAudit({
            userId: user.id,
            action: 'ACCOUNT_LOCKED',
            entity: 'User',
            entityId: user.id,
            after: {
                failedLoginAttempts: attempts,
                lockedUntil: lockedUntil.toISOString(),
            },
            ipAddress,
        });
    }
}

async function revokeFamily(familyId, revokedAt) {
    if (!familyId) return { count: 0 };

    return prisma.refreshToken.updateMany({
        where: { familyId, revokedAt: null },
        data: { revokedAt },
    });
}

async function auditReplay(stored, ipAddress) {
    await logAudit({
        userId: stored.userId,
        action: 'REFRESH_TOKEN_REPLAY_DETECTED',
        entity: 'RefreshToken',
        entityId: stored.id,
        ipAddress,
    });
}

/** Audit replay defensively: an audit failure must never change the 401. */
async function safeAuditReplay(stored, ipAddress) {
    try {
        await auditReplay(stored, ipAddress);
    } catch (error) {
        console.warn(
            JSON.stringify({
                level: 'warn',
                message: 'failed to record refresh replay audit',
                errorName: error?.name || 'Error',
            }),
        );
    }
}

/**
 * Authenticates a user and opens a new refresh-token session.
 *
 * Returns the raw refresh token exactly once so the controller can place it in
 * an HttpOnly cookie. It must never be included in the JSON response.
 */
export async function login({ identifier, password, ipAddress = null, userAgent = null }) {
    const user = await findUserForLogin(identifier);

    if (!user) {
        // Equalise timing with a real bcrypt comparison for unknown accounts.
        await verifyPassword(password, DUMMY_PASSWORD_HASH);
        throw invalidCredentials();
    }

    const now = new Date();

    // A7: if a previous lock has expired, atomically reset before re-checking.
    if (user.lockedUntil && user.lockedUntil.getTime() <= now.getTime()) {
        await prisma.user.updateMany({
            where: { id: user.id, lockedUntil: { lte: now } },
            data: { failedLoginAttempts: 0, lockedUntil: null },
        });
        user.lockedUntil = null;
        user.failedLoginAttempts = 0;
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    const lockActive = Boolean(user.lockedUntil && user.lockedUntil.getTime() > now.getTime());

    if (lockActive) {
        // Only a caller who already knows the password learns that the account
        // is locked; everyone else receives the same generic error.
        if (passwordMatches) {
            throw new ApiError(
                423,
                'الحساب مقفل مؤقتاً بسبب محاولات دخول غير صحيحة',
                'ACCOUNT_LOCKED',
                {
                    retryAfterSeconds: Math.max(
                        1,
                        Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 1000),
                    ),
                },
            );
        }

        throw invalidCredentials();
    }

    if (!passwordMatches) {
        try {
            await registerFailedLogin(user, now, ipAddress);
        } catch (error) {
            if (error?.code !== 'P2025') throw error;
        }

        throw invalidCredentials();
    }

    if (!user.isActive) {
        throw new ApiError(403, 'هذا الحساب غير مفعل. تواصل مع الإدارة', 'ACCOUNT_INACTIVE');
    }

    const refreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(refreshToken);
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(now.getTime() + getRefreshTokenTtlMs());
    const familyExpiresAt = new Date(
        now.getTime() + env.refreshSessionMaxDays * 24 * 60 * 60 * 1000,
    );
    const accessToken = signAccessToken(user);

    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
        });

        await tx.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash,
                familyId,
                expiresAt,
                familyExpiresAt,
                userAgent,
                ipAddress,
            },
        });

        await logAudit({
            userId: user.id,
            action: 'LOGIN_SUCCESS',
            entity: 'User',
            entityId: user.id,
            after: { role: user.role },
            ipAddress,
            tx,
        });
    });

    return {
        accessToken,
        refreshToken,
        user: sanitizeUser(user),
    };
}

/**
 * Rotates a refresh token transactionally.
 *
 * Reuse of an already-revoked token revokes every active token in the same
 * family (replay detection). The API never reveals whether a token existed.
 */
export async function refresh({ refreshToken, ipAddress = null, userAgent = null }) {
    if (!refreshToken || typeof refreshToken !== 'string') {
        throw invalidRefreshToken();
    }

    const tokenHash = hashRefreshToken(refreshToken);
    const now = new Date();

    const stored = await prisma.refreshToken.findUnique({
        where: { tokenHash },
        select: {
            id: true,
            userId: true,
            familyId: true,
            expiresAt: true,
            revokedAt: true,
            rotatedAt: true,
            replacedByTokenId: true,
            familyExpiresAt: true,
            user: { select: SAFE_USER_SELECT },
        },
    });

    if (!stored) {
        throw invalidRefreshToken();
    }

    const familyExpiresAt = stored.familyExpiresAt
        ? new Date(stored.familyExpiresAt)
        : stored.expiresAt;
    if (familyExpiresAt.getTime() <= now.getTime()) {
        await revokeFamily(stored.familyId, now);
        throw invalidRefreshToken();
    }

    if (stored.revokedAt) {
        return classifyRevokedToken(stored, now, ipAddress);
    }

    if (stored.expiresAt.getTime() <= now.getTime()) {
        await prisma.refreshToken.updateMany({
            where: { id: stored.id, revokedAt: null },
            data: { revokedAt: now },
        });
        throw invalidRefreshToken();
    }

    if (!stored.user || !stored.user.isActive) {
        await revokeFamily(stored.familyId, now);
        await safeAuditReplay(stored, ipAddress);
        throw invalidRefreshToken();
    }

    const newRefreshToken = generateRefreshToken();
    const newTokenHash = hashRefreshToken(newRefreshToken);
    const newTokenId = crypto.randomUUID();
    const expiresAt = new Date(now.getTime() + getRefreshTokenTtlMs());

    let rotated = false;

    await prisma.$transaction(async (tx) => {
        const claimed = await tx.refreshToken.updateMany({
            where: { id: stored.id, revokedAt: null, expiresAt: { gt: now } },
            data: {
                revokedAt: now,
                lastUsedAt: now,
                rotatedAt: now,
                replacedByTokenId: newTokenId,
            },
        });

        if (claimed.count !== 1) return;

        await tx.refreshToken.create({
            data: {
                id: newTokenId,
                userId: stored.userId,
                tokenHash: newTokenHash,
                familyId: stored.familyId,
                expiresAt,
                familyExpiresAt,
                userAgent,
                ipAddress,
            },
        });

        rotated = true;
    });

    if (!rotated) {
        const reread = await prisma.refreshToken.findUnique({
            where: { id: stored.id },
            select: {
                id: true,
                userId: true,
                familyId: true,
                revokedAt: true,
                rotatedAt: true,
                replacedByTokenId: true,
                expiresAt: true,
            },
        });
        if (reread) return classifyRevokedToken(reread, now, ipAddress);
        throw invalidRefreshToken();
    }

    return {
        accessToken: signAccessToken(stored.user),
        refreshToken: newRefreshToken,
        user: sanitizeUser(stored.user),
    };
}

/** Grace window during which a revoked token with an active replacement is a race. */
const REFRESH_RACE_GRACE_MS = 10 * 1000;

async function classifyRevokedToken(stored, now, ipAddress) {
    if (stored.replacedByTokenId && stored.rotatedAt) {
        const rotatedAt = new Date(stored.rotatedAt).getTime();
        if (now.getTime() - rotatedAt <= REFRESH_RACE_GRACE_MS) {
            const replacement = await prisma.refreshToken.findUnique({
                where: { id: stored.replacedByTokenId },
                select: { revokedAt: true, expiresAt: true },
            });
            if (
                replacement &&
                !replacement.revokedAt &&
                replacement.expiresAt.getTime() > now.getTime()
            ) {
                throw new ApiError(401, 'الجلسة يتم تحديثها، أعد المحاولة', 'REFRESH_RACE', {
                    retryable: true,
                });
            }
        }
    }

    await revokeFamily(stored.familyId, now);
    await safeAuditReplay(stored, ipAddress);
    throw invalidRefreshToken();
}

/**
 * Revokes the session identified by the refresh cookie. Returns successfully
 * even when the token is unknown so callers cannot probe token existence.
 */
export async function logout({ refreshToken = null, userId = null, ipAddress = null } = {}) {
    const now = new Date();
    let resolvedUserId = userId || null;

    if (refreshToken) {
        const tokenHash = hashRefreshToken(refreshToken);
        const stored = await prisma.refreshToken.findUnique({
            where: { tokenHash },
            select: { userId: true, familyId: true },
        });

        if (stored) {
            resolvedUserId = stored.userId;
            await revokeFamily(stored.familyId, now);
        }
    }

    if (resolvedUserId) {
        await logAudit({
            userId: resolvedUserId,
            action: 'LOGOUT',
            entity: 'User',
            entityId: resolvedUserId,
            ipAddress,
        });
    }

    return { revoked: Boolean(resolvedUserId) };
}

/**
 * Revokes every active refresh-token session for a user (logout-all).
 */
export async function logoutAll(userId, { ipAddress = null } = {}) {
    const now = new Date();

    const result = await prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
    });

    await logAudit({
        userId,
        action: 'LOGOUT_ALL',
        entity: 'User',
        entityId: userId,
        after: { revokedSessions: result.count },
        ipAddress,
    });

    return { revokedSessions: result.count };
}

export async function getCurrentUser(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: SAFE_USER_SELECT,
    });

    if (!user || !user.isActive) {
        throw new ApiError(401, 'الحساب غير موجود أو غير نشط', 'ACCOUNT_INACTIVE');
    }

    return sanitizeUser(user);
}
