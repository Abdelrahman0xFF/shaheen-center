import { env } from '../config/env.js';
import { ApiError } from './errorHandler.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function normalizeOrigin(value) {
    if (!value) return null;
    const raw = String(value).trim();
    if (!raw || raw === 'null') return null;
    try {
        return new URL(raw).origin;
    } catch {
        return null;
    }
}

function refererOrigin(referer) {
    if (!referer) return null;
    try {
        return new URL(String(referer)).origin;
    } catch {
        return null;
    }
}

function hasRefreshCookie(req) {
    const name = env.refreshCookieName;
    if (req.cookies && typeof req.cookies === 'object' && req.cookies[name]) return true;
    const header = req.headers?.cookie;
    if (typeof header === 'string' && header.length > 0) {
        // Lightweight presence check; exact parsing happens in parseCookies.
        return header.split(';').some((part) => part.trim().startsWith(`${name}=`));
    }
    return false;
}

function checkOrigin(req, _res, next, options) {
    const { requireForCookieAuth = false } = options || {};

    if (SAFE_METHODS.has(req.method)) return next();

    const secFetchSite = req.headers?.['sec-fetch-site'];
    if (typeof secFetchSite === 'string' && secFetchSite.trim().toLowerCase() === 'cross-site') {
        return next(new ApiError(403, 'طلب غير موثوق', 'UNTRUSTED_ORIGIN'));
    }

    const trusted = env.trustedOrigins;
    const rawOrigin = req.headers?.origin;
    const hasOriginHeader =
        rawOrigin !== undefined && rawOrigin !== null && String(rawOrigin).trim() !== '';

    if (hasOriginHeader) {
        if (String(rawOrigin).trim() === 'null') {
            return next(new ApiError(403, 'طلب غير موثوق', 'UNTRUSTED_ORIGIN'));
        }
        const origin = normalizeOrigin(rawOrigin);
        if (!origin || !trusted.includes(origin)) {
            return next(new ApiError(403, 'طلب غير موثوق', 'UNTRUSTED_ORIGIN'));
        }
        return next();
    }

    const rawReferer = req.headers?.referer;
    if (rawReferer) {
        const origin = refererOrigin(rawReferer);
        if (!origin || !trusted.includes(origin)) {
            return next(new ApiError(403, 'طلب غير موثوق', 'UNTRUSTED_ORIGIN'));
        }
        return next();
    }

    // Neither Origin nor Referer.
    if (requireForCookieAuth && hasRefreshCookie(req)) {
        return next(new ApiError(403, 'المصدر مطلوب لهذا الطلب', 'ORIGIN_REQUIRED'));
    }

    if (
        typeof secFetchSite === 'string' &&
        secFetchSite.trim().toLowerCase() !== 'none' &&
        secFetchSite.trim() !== ''
    ) {
        return next(new ApiError(403, 'طلب غير موثوق', 'UNTRUSTED_ORIGIN'));
    }

    return next();
}

/** Global middleware instance. */
export function verifyTrustedOrigin(req, res, next) {
    return checkOrigin(req, res, next, {});
}

/** Factory for configurable usage. */
export function createTrustedOriginMiddleware(options = {}) {
    return (req, res, next) => checkOrigin(req, res, next, options);
}

/** Strict variant for cookie-authenticated routes. */
export function verifyTrustedOriginForCookie(req, res, next) {
    return checkOrigin(req, res, next, { requireForCookieAuth: true });
}
