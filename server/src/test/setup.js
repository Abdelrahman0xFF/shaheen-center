/**
 * Deterministic test configuration. Values are assigned (not defaulted) so a
 * developer's local .env can never change test behaviour.
 */
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/shaheen_test';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_ISSUER = 'shaheen-center-api';
process.env.JWT_AUDIENCE = 'shaheen-center-client';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-not-used-by-opaque-tokens';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.BLIND_INDEX_SECRET = 'test-blind-index-secret';
process.env.AUTH_MAX_FAILED_ATTEMPTS = '5';
process.env.AUTH_LOCKOUT_MINUTES = '15';
process.env.LOGIN_RATE_LIMIT_MAX = '1000';
process.env.LOGIN_RATE_LIMIT_WINDOW_MS = '900000';
process.env.REFRESH_RATE_LIMIT_MAX = '1000';
process.env.REFRESH_RATE_LIMIT_WINDOW_MS = '900000';
process.env.REFRESH_COOKIE_NAME = 'shaheen_refresh_token';
process.env.REFRESH_COOKIE_PATH = '/api/auth';
process.env.REFRESH_COOKIE_SAMESITE = 'lax';
process.env.TRUST_PROXY = 'false';
process.env.TRUSTED_ORIGINS = '';
