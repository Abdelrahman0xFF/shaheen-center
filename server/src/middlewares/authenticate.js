import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { verifyAccessToken } from '../utils/token.js';
import { ApiError } from './errorHandler.js';

/**
 * Verifies a JWT Bearer token, reloads the account from PostgreSQL, and
 * attaches a safe req.user object. The database role is authoritative, so
 * role changes and deactivations take effect immediately (FR-AUTH-02).
 */
export async function authenticate(req, _res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new ApiError(401, 'يجب تسجيل الدخول أولاً', 'UNAUTHORIZED');
        }

        const token = authHeader.slice(7).trim();
        if (!token) {
            throw new ApiError(401, 'يجب تسجيل الدخول أولاً', 'UNAUTHORIZED');
        }

        let payload;
        try {
            payload = verifyAccessToken(token);
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new ApiError(401, 'انتهت صلاحية جلسة الدخول', 'TOKEN_EXPIRED');
            }
            if (error instanceof jwt.NotBeforeError) {
                throw new ApiError(401, 'رمز الدخول غير صالح', 'INVALID_TOKEN');
            }
            throw new ApiError(401, 'رمز الدخول غير صالح', 'INVALID_TOKEN');
        }

        if (!payload?.sub || typeof payload.sub !== 'string') {
            throw new ApiError(401, 'رمز الدخول غير صالح', 'INVALID_TOKEN');
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                role: true,
                name: true,
                phone: true,
                username: true,
                isActive: true,
                tokenVersion: true,
                branches: { select: { branchId: true } },
                instructorProfile: { select: { id: true } },
                studentProfile: { select: { id: true } },
            },
        });

        if (!user || !user.isActive) {
            throw new ApiError(401, 'الحساب غير موجود أو غير نشط', 'ACCOUNT_INACTIVE');
        }

        // Reject access tokens issued before a sensitive change bumped tokenVersion,
        // or tokens whose tokenVersion claim is missing/malformed (fail closed).
        const tokenVersion = payload.tokenVersion;
        if (!Number.isInteger(tokenVersion) || tokenVersion < 0) {
            throw new ApiError(401, 'رمز الدخول غير صالح', 'INVALID_TOKEN');
        }
        if (tokenVersion !== (user.tokenVersion ?? 0)) {
            throw new ApiError(401, 'انتهت صلاحية الجلسة، سجّل الدخول مرة أخرى', 'TOKEN_REVOKED');
        }

        req.user = {
            id: user.id,
            role: user.role,
            name: user.name,
            phone: user.phone,
            username: user.username,
            isActive: true,
            branchIds: user.branches.map((branch) => branch.branchId),
            instructorProfile: user.instructorProfile || null,
            studentProfile: user.studentProfile || null,
            instructorId: user.instructorProfile?.id || null,
            studentId: user.studentProfile?.id || null,
        };

        return next();
    } catch (error) {
        if (error instanceof ApiError) return next(error);
        return next(new ApiError(401, 'جلسة الدخول منتهية أو غير صالحة', 'INVALID_TOKEN'));
    }
}
