import 'dotenv/config';

export const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT) || 5000,
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    databaseUrl: process.env.DATABASE_URL || '',
    jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-env',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-env',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    encryptionKey:
        process.env.ENCRYPTION_KEY ||
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    blindIndexSecret: process.env.BLIND_INDEX_SECRET || 'dev-blind-index-secret-change-in-env',
    notificationMode: process.env.NOTIFICATION_MODE || 'MOCK',
    zagelApiUrl: process.env.ZAGEL_API_URL || '',
    zagelApiKey: process.env.ZAGEL_API_KEY || '',
};
