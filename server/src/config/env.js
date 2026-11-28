import 'dotenv/config';

function parseBoolean(value, fallback = false) {
    if (value === undefined || value === null || value === '') return fallback;
    return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function parsePositiveInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOrigins(clientUrl, extraOrigins) {
    const origins = new Set();

    for (const candidate of [clientUrl, ...String(extraOrigins || '').split(',')]) {
        const value = String(candidate || '').trim();
        if (!value) continue;

        try {
            origins.add(new URL(value).origin);
        } catch {
            // Invalid origins are rejected by validateEnv() instead of being trusted silently.
        }
    }

    return [...origins];
}

const nodeEnv = process.env.NODE_ENV || 'development';
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

export const env = {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isTest: nodeEnv === 'test',
    port: Number(process.env.PORT) || 5000,
    clientUrl,
    trustedOrigins: parseOrigins(clientUrl, process.env.TRUSTED_ORIGINS),
    trustProxy: parseBoolean(process.env.TRUST_PROXY, false),
    databaseUrl: process.env.DATABASE_URL || '',

    // Access tokens (short-lived, HS256, pinned issuer/audience)
    jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-env',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    jwtIssuer: process.env.JWT_ISSUER || 'shaheen-center-api',
    jwtAudience: process.env.JWT_AUDIENCE || 'shaheen-center-client',

    // Refresh tokens are opaque random strings; JWT_REFRESH_SECRET is deprecated and unused.
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-env',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    // Absolute family lifetime for a refresh session chain (A7).
    refreshSessionMaxDays: parsePositiveInt(process.env.REFRESH_SESSION_MAX_DAYS, 30),

    // Refresh cookie
    refreshCookieName: process.env.REFRESH_COOKIE_NAME || 'shaheen_refresh_token',
    refreshCookiePath: process.env.REFRESH_COOKIE_PATH || '/api/auth',
    refreshCookieSameSite: (process.env.REFRESH_COOKIE_SAMESITE || 'lax').toLowerCase(),

    // Login lockout
    loginMaxFailedAttempts: parsePositiveInt(process.env.AUTH_MAX_FAILED_ATTEMPTS, 5),
    loginLockoutMinutes: parsePositiveInt(process.env.AUTH_LOCKOUT_MINUTES, 15),

    // Rate limiting
    loginRateLimitWindowMs: parsePositiveInt(
        process.env.LOGIN_RATE_LIMIT_WINDOW_MS,
        15 * 60 * 1000,
    ),
    loginRateLimitMax: parsePositiveInt(process.env.LOGIN_RATE_LIMIT_MAX, 20),
    refreshRateLimitWindowMs: parsePositiveInt(
        process.env.REFRESH_RATE_LIMIT_WINDOW_MS,
        15 * 60 * 1000,
    ),
    refreshRateLimitMax: parsePositiveInt(process.env.REFRESH_RATE_LIMIT_MAX, 120),

    // Existing security configuration
    encryptionKey:
        process.env.ENCRYPTION_KEY ||
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    blindIndexSecret: process.env.BLIND_INDEX_SECRET || 'dev-blind-index-secret-change-in-env',
    notificationMode: process.env.NOTIFICATION_MODE || 'MOCK',
    zagelApiUrl: process.env.ZAGEL_API_URL || '',
    zagelApiKey: process.env.ZAGEL_API_KEY || '',
};

const KNOWN_WEAK_SECRETS = new Set([
    'dev-jwt-secret-change-in-env',
    'dev-refresh-secret-change-in-env',
    'dev-blind-index-secret-change-in-env',
    'changeme',
    'secret',
    'password',
    'test-jwt-secret',
]);

const DURATION_RE = /^(\d+)\s*(ms|s|m|h|d|w)$/i;
const DURATION_UNITS_MS = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };

function parseDurationMsEnv(value) {
    const match = DURATION_RE.exec(String(value ?? '').trim());
    if (!match) return null;
    return Number(match[1]) * DURATION_UNITS_MS[match[2].toLowerCase()];
}

function isAbsoluteHttpUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

function originOnly(value) {
    try {
        const url = new URL(value);
        return url.origin === String(value).trim().replace(/\/$/, '');
    } catch {
        return false;
    }
}

/**
 * Validates the runtime configuration before the server starts.
 * Aggregates every error; lists variable NAMES only, never values.
 * Development keeps convenience fallbacks (warns); production requires
 * every security-sensitive value to be explicitly configured.
 */
export function validateEnv() {
    const errors = [];
    const warnings = [];
    const prod = env.isProduction;

    // NODE_ENV
    if (!['development', 'test', 'production'].includes(env.nodeEnv)) {
        errors.push('NODE_ENV must be one of: development, test, production.');
    }

    // PORT
    const rawPort = process.env.PORT;
    if (rawPort !== undefined && rawPort !== '' && !/^\d+$/.test(String(rawPort).trim())) {
        errors.push('PORT must be an integer between 1 and 65535.');
    } else if (!Number.isInteger(env.port) || env.port < 1 || env.port > 65535) {
        errors.push('PORT must be an integer between 1 and 65535.');
    }

    // DATABASE_URL
    if (!env.databaseUrl) {
        errors.push('DATABASE_URL is required (PostgreSQL connection string).');
    } else if (!/^postgres(ql)?:\/\//.test(env.databaseUrl)) {
        errors.push('DATABASE_URL must be a postgresql:// or postgres:// URL.');
    }

    // JWT
    const jwtSecretRaw = process.env.JWT_SECRET || '';
    if (prod) {
        if (!jwtSecretRaw || jwtSecretRaw.length < 32 || KNOWN_WEAK_SECRETS.has(jwtSecretRaw)) {
            errors.push(
                'JWT_SECRET must be explicitly set to at least 32 non-placeholder characters in production.',
            );
        }
    } else if (!jwtSecretRaw) {
        warnings.push('JWT_SECRET not set; using an insecure development fallback.');
    }

    const accessMs = parseDurationMsEnv(env.jwtExpiresIn);
    if (accessMs === null) {
        errors.push('JWT_EXPIRES_IN must be a duration such as 15m, 1h.');
    } else if (accessMs < 60_000 || accessMs > 60 * 60 * 1000) {
        errors.push('JWT_EXPIRES_IN access token must be between 1m and 1h.');
    }

    const refreshMs = parseDurationMsEnv(env.refreshTokenExpiresIn);
    if (refreshMs === null) {
        errors.push('JWT_REFRESH_EXPIRES_IN must be a duration such as 7d, 12h.');
    } else if (refreshMs < 60 * 60 * 1000 || refreshMs > 30 * 24 * 60 * 60 * 1000) {
        errors.push('JWT_REFRESH_EXPIRES_IN must be between 1h and 30d.');
    }

    if (!env.jwtIssuer || env.jwtIssuer.length > 100) {
        errors.push('JWT_ISSUER must be non-empty and at most 100 characters.');
    }
    if (!env.jwtAudience || env.jwtAudience.length > 100) {
        errors.push('JWT_AUDIENCE must be non-empty and at most 100 characters.');
    }

    // ENCRYPTION_KEY
    if (!/^[0-9a-fA-F]{64}$/.test(env.encryptionKey)) {
        errors.push('ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes).');
    } else if (
        /^0{64}$/.test(env.encryptionKey) ||
        env.encryptionKey === '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    ) {
        errors.push('ENCRYPTION_KEY must not be all-zero or the documented default.');
    }

    // BLIND_INDEX_SECRET
    if (prod) {
        if (
            !process.env.BLIND_INDEX_SECRET ||
            process.env.BLIND_INDEX_SECRET.length < 32 ||
            KNOWN_WEAK_SECRETS.has(process.env.BLIND_INDEX_SECRET)
        ) {
            errors.push(
                'BLIND_INDEX_SECRET must be explicitly set to at least 32 characters in production.',
            );
        }
    } else if (!process.env.BLIND_INDEX_SECRET) {
        warnings.push('BLIND_INDEX_SECRET not set; using an insecure development fallback.');
    }

    // CLIENT_URL
    if (!env.clientUrl || !isAbsoluteHttpUrl(env.clientUrl)) {
        errors.push('CLIENT_URL must be an absolute http/https URL.');
    } else {
        try {
            const u = new URL(env.clientUrl);
            if (u.username || u.password) errors.push('CLIENT_URL must not contain credentials.');
            if (u.search || u.hash) errors.push('CLIENT_URL must not contain query or hash.');
            if (prod && u.protocol !== 'https:')
                errors.push('CLIENT_URL must use HTTPS in production.');
        } catch {
            errors.push('CLIENT_URL must be an absolute http/https URL.');
        }
    }

    // TRUSTED_ORIGINS
    if (
        (process.env.TRUSTED_ORIGINS || '')
            .split(',')
            .map((s) => s.trim())
            .includes('*') ||
        env.trustedOrigins.includes('*')
    ) {
        errors.push('TRUSTED_ORIGINS must not contain a wildcard.');
    }
    if (env.trustedOrigins.length === 0) {
        errors.push('CLIENT_URL/TRUSTED_ORIGINS must include at least one valid origin.');
    }
    if (env.trustedOrigins.length > 10) {
        errors.push('TRUSTED_ORIGINS may list at most 10 origins.');
    }
    for (const origin of env.trustedOrigins) {
        if (origin === '*') {
            errors.push('TRUSTED_ORIGINS must not contain a wildcard.');
            break;
        }
        if (prod && !origin.startsWith('https://')) {
            errors.push('TRUSTED_ORIGINS entries must use HTTPS in production.');
            break;
        }
    }

    // Refresh cookie
    if (!/^[A-Za-z0-9_!#$%&'*+.^`|~-]+$/.test(env.refreshCookieName)) {
        errors.push('REFRESH_COOKIE_NAME must be a valid cookie token.');
    }
    if (env.refreshCookieName.startsWith('__Host-') && env.refreshCookiePath !== '/') {
        errors.push('REFRESH_COOKIE_NAME with __Host- requires REFRESH_COOKIE_PATH=/.');
    }
    if (!env.refreshCookiePath.startsWith('/') || env.refreshCookiePath.includes('..')) {
        errors.push('REFRESH_COOKIE_PATH must start with / and not contain ...');
    }
    if (!['lax', 'strict', 'none'].includes(env.refreshCookieSameSite)) {
        errors.push('REFRESH_COOKIE_SAMESITE must be one of: lax, strict, none.');
    }
    if (env.refreshCookieSameSite === 'none' && !prod) {
        errors.push('REFRESH_COOKIE_SAMESITE=none requires NODE_ENV=production (Secure cookies).');
    }

    // Session absolute lifetime
    if (
        !Number.isInteger(env.refreshSessionMaxDays) ||
        env.refreshSessionMaxDays < 1 ||
        env.refreshSessionMaxDays > 90
    ) {
        errors.push('REFRESH_SESSION_MAX_DAYS must be an integer between 1 and 90.');
    }

    // Lockout
    if (
        !Number.isInteger(env.loginMaxFailedAttempts) ||
        env.loginMaxFailedAttempts < 3 ||
        env.loginMaxFailedAttempts > 10
    ) {
        errors.push('AUTH_MAX_FAILED_ATTEMPTS must be an integer between 3 and 10.');
    }
    if (
        !Number.isInteger(env.loginLockoutMinutes) ||
        env.loginLockoutMinutes < 1 ||
        env.loginLockoutMinutes > 1440
    ) {
        errors.push('AUTH_LOCKOUT_MINUTES must be an integer between 1 and 1440.');
    }

    // Rate limits
    for (const [name, val] of [
        ['LOGIN_RATE_LIMIT_WINDOW_MS', env.loginRateLimitWindowMs],
        ['LOGIN_RATE_LIMIT_MAX', env.loginRateLimitMax],
        ['REFRESH_RATE_LIMIT_WINDOW_MS', env.refreshRateLimitWindowMs],
        ['REFRESH_RATE_LIMIT_MAX', env.refreshRateLimitMax],
    ]) {
        if (!Number.isInteger(val) || val < 1) errors.push(`${name} must be a positive integer.`);
    }
    if (env.loginRateLimitWindowMs < 1000)
        errors.push('LOGIN_RATE_LIMIT_WINDOW_MS must be at least 1000 ms.');
    if (env.refreshRateLimitWindowMs < 1000)
        errors.push('REFRESH_RATE_LIMIT_WINDOW_MS must be at least 1000 ms.');

    // Notifications
    if (!['MOCK', 'QUEUED_ONLY'].includes(env.notificationMode)) {
        errors.push('NOTIFICATION_MODE must be MOCK or QUEUED_ONLY.');
    }
    if (env.zagelApiUrl && !String(env.zagelApiUrl).startsWith('https://')) {
        errors.push('ZAGEL_API_URL must use HTTPS when set.');
    }

    for (const warning of warnings) console.warn(`[env] ${warning}`);

    if (errors.length > 0) {
        throw new Error(`Invalid environment configuration:\n- ${errors.join('\n- ')}`);
    }
}
