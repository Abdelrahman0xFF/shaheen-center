import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import {
    clearRefreshCookie,
    getRefreshTokenFromRequest,
    setRefreshCookie,
} from '../utils/cookies.js';
import { getRefreshTokenTtlMs } from '../utils/token.js';
import { getClientIp, getUserAgent } from '../utils/requestContext.js';
import * as authService from '../services/auth.service.js';

function noStore(res) {
    res.set('Cache-Control', 'no-store');
    res.set('Pragma', 'no-cache');
}

function requestMeta(req) {
    return {
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
    };
}

// Member 1 (Ezzat) — FR-AUTH-01, FR-AUTH-02, FR-AUTH-03, FR-AUTH-07
export const login = asyncHandler(async (req, res) => {
    const result = await authService.login({
        identifier: req.body.identifier,
        password: req.body.password,
        ...requestMeta(req),
    });

    setRefreshCookie(res, result.refreshToken, getRefreshTokenTtlMs());
    noStore(res);

    return sendSuccess(res, {
        data: {
            accessToken: result.accessToken,
            user: result.user,
        },
        message: 'تم تسجيل الدخول بنجاح',
    });
});

export const refresh = asyncHandler(async (req, res) => {
    noStore(res);

    try {
        const result = await authService.refresh({
            refreshToken: getRefreshTokenFromRequest(req),
            ...requestMeta(req),
        });

        setRefreshCookie(res, result.refreshToken, getRefreshTokenTtlMs());

        return sendSuccess(res, {
            data: {
                accessToken: result.accessToken,
                user: result.user,
            },
            message: 'تم تحديث الجلسة',
        });
    } catch (error) {
        // Only clear the cookie for terminal errors; never on a retryable race.
        if (error?.code !== 'REFRESH_RACE') {
            clearRefreshCookie(res);
        }
        throw error;
    }
});

export const logout = asyncHandler(async (req, res) => {
    const result = await authService.logout({
        refreshToken: getRefreshTokenFromRequest(req),
        userId: req.user?.id || null,
        ipAddress: getClientIp(req),
    });

    clearRefreshCookie(res);
    noStore(res);

    return sendSuccess(res, {
        data: { revoked: result.revoked },
        message: 'تم تسجيل الخروج',
    });
});

export const logoutAll = asyncHandler(async (req, res) => {
    const result = await authService.logoutAll(req.user.id, {
        ipAddress: getClientIp(req),
    });

    clearRefreshCookie(res);
    noStore(res);

    return sendSuccess(res, {
        data: result,
        message: 'تم إنهاء جميع الجلسات',
    });
});

export const me = asyncHandler(async (req, res) => {
    const profile = await authService.getCurrentUser(req.user.id);

    noStore(res);

    return sendSuccess(res, { data: profile });
});
