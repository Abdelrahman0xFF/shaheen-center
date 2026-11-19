import { prisma } from '../config/prisma.js';

/**
 * Member 1 (Ezzat) — Auth & Token Service
 * TODO:
 * - login({ identifier, password }): verify bcrypt, handle failedLoginAttempts & lockedUntil, issue access + refresh JWTs
 * - refresh(refreshToken): verify refreshTokenHash, rotate tokens
 * - logout(userId): clear refreshTokenHash
 */
export async function getCurrentUser(userId) {
    return prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            role: true,
            name: true,
            phone: true,
            username: true,
            isActive: true,
            branches: {
                select: {
                    branch: { select: { id: true, name: true } },
                },
            },
        },
    });
}
