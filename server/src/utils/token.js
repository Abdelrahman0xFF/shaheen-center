import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const ACCESS_TOKEN_ALGORITHM = 'HS256';

const DURATION_UNITS = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
};

/**
 * Parses durations such as "7d", "12h", "30m", "45s" into milliseconds.
 */
export function parseDurationMs(value) {
    const match = /^(\d+)\s*(ms|s|m|h|d|w)$/i.exec(String(value ?? '').trim());
    if (!match) {
        throw new Error(`Invalid duration value: ${value}`);
    }

    return Number(match[1]) * DURATION_UNITS[match[2].toLowerCase()];
}

export function getRefreshTokenTtlMs() {
    return parseDurationMs(env.refreshTokenExpiresIn);
}

/**
 * Signs a short-lived access token. The payload intentionally contains only
 * identity/authorisation claims — never passwords, national IDs, or tokens.
 */
export function signAccessToken(user) {
    return jwt.sign(
        {
            role: user.role,
            jti: crypto.randomUUID(),
            tokenVersion: user.tokenVersion ?? 0,
        },
        env.jwtSecret,
        {
            algorithm: ACCESS_TOKEN_ALGORITHM,
            expiresIn: env.jwtExpiresIn,
            issuer: env.jwtIssuer,
            audience: env.jwtAudience,
            subject: user.id,
        },
    );
}

/**
 * Verifies an access token with a pinned algorithm, issuer, audience, and
 * expiry check. Throws jsonwebtoken errors for callers to translate.
 */
export function verifyAccessToken(token) {
    return jwt.verify(token, env.jwtSecret, {
        algorithms: [ACCESS_TOKEN_ALGORITHM],
        issuer: env.jwtIssuer,
        audience: env.jwtAudience,
    });
}

/**
 * Creates an opaque, cryptographically random refresh token.
 * 48 random bytes → 64 URL-safe characters.
 */
export function generateRefreshToken() {
    return crypto.randomBytes(48).toString('base64url');
}

/**
 * Only this SHA-256 hash is persisted. The raw token lives solely in the
 * HttpOnly cookie, so a database leak cannot be replayed.
 */
export function hashRefreshToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
}
