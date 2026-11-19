import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { ApiError } from './errorHandler.js';

/**
 * Verifies JWT Bearer token and attaches req.user = { id, role, name, phone, branchIds }.
 * Member 1 (Ezzat) owns authentication & token lifecycle.
 */
export async function authenticate(req, _res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new ApiError(401, 'يجب تسجيل الدخول أولاً', 'UNAUTHORIZED');
        }

        const token = authHeader.slice(7);
        const payload = jwt.verify(token, env.jwtSecret);

        const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                role: true,
                name: true,
                phone: true,
                isActive: true,
                branches: { select: { branchId: true } },
            },
        });

        if (!user || !user.isActive) {
            throw new ApiError(401, 'الحساب غير نشط أو غير موجود', 'ACCOUNT_INACTIVE');
        }

        req.user = {
            id: user.id,
            role: user.role,
            name: user.name,
            phone: user.phone,
            branchIds: user.branches.map((b) => b.branchId),
        };

        next();
    } catch (err) {
        if (err instanceof ApiError) return next(err);
        return next(new ApiError(401, 'جلسة الدخول منتهية أو غير صالحة', 'INVALID_TOKEN'));
    }
}
