import { env } from '../config/env.js';

/**
 * Minimal cookie-header parser. The project does not depend on cookie-parser,
 * and refresh tokens are the only cookie we read.
 */
export function parseCookieHeader(header) {
    const cookies = {};

    if (!header || typeof header !== 'string') return cookies;

    for (const part of header.split(';')) {
        const separator = part.indexOf('=');
        if (separator < 0) continue;

        const name = part.slice(0, separator).trim();
        if (!name) continue;

        const rawValue = part.slice(separator + 1).trim();
        try {
            cookies[name] = decodeURIComponent(rawValue);
        } catch {
            cookies[name] = rawValue;
        }
    }

    return cookies;
}

export function parseCookies(req, _res, next) {
    req.cookies = parseCookieHeader(req.headers?.cookie);
    next();
}

export function getRefreshTokenFromRequest(req) {
    if (req.cookies && typeof req.cookies === 'object') {
        return req.cookies[env.refreshCookieName] || null;
    }

    return parseCookieHeader(req.headers?.cookie)[env.refreshCookieName] || null;
}

export function refreshCookieOptions(maxAgeMs) {
    return {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: env.refreshCookieSameSite,
        path: env.refreshCookiePath,
        ...(Number.isFinite(maxAgeMs) ? { maxAge: maxAgeMs } : {}),
    };
}

export function setRefreshCookie(res, token, maxAgeMs) {
    res.cookie(env.refreshCookieName, token, refreshCookieOptions(maxAgeMs));
}

export function clearRefreshCookie(res) {
    res.clearCookie(env.refreshCookieName, refreshCookieOptions());
}
