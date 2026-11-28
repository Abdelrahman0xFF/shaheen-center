import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import apiRoutes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';
import { requestId } from './middlewares/requestId.js';
import { verifyTrustedOrigin } from './middlewares/verifyTrustedOrigin.js';
import { parseCookies } from './utils/cookies.js';

const app = express();

// Trust the first proxy only when explicitly configured (needed for real client IPs).
if (env.trustProxy) {
    app.set('trust proxy', 1);
}

// Request id first so everything downstream can reference it.
app.use(requestId);

// Security & request parsing
app.use(helmet());
app.use(
    cors({
        origin: env.trustedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
        exposedHeaders: ['X-Request-Id'],
        maxAge: 600,
        optionsSuccessStatus: 204,
    }),
);

// Request logging (safe URL only; never auth headers/query strings)
if (env.nodeEnv !== 'test') {
    morgan.token('safe-url', (req) => String(req.path || ''));
    const skip = (req) => req.path === '/api/health' || req.path === '/api/ready';
    app.use(
        morgan(
            env.nodeEnv === 'development'
                ? ':method :safe-url :status'
                : ':method :safe-url :status :response-time ms',
            { skip },
        ),
    );
}

// Request parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(parseCookies);

// CSRF / origin hardening for unsafe methods (applied globally after cookies).
app.use(verifyTrustedOrigin);

// Health check
app.get('/api/health', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Shaheen Center API is running',
        data: {
            service: 'shaheen-center-api',
            timestampUtc: new Date().toISOString(),
        },
    });
});

// Readiness check (PostgreSQL connectivity)
app.get('/api/ready', async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        res.status(200).json({
            success: true,
            message: 'Shaheen Center API is ready',
        });
    } catch (error) {
        // Log only the error class/code; never expose connection details or SQL.
        const errorName = error?.name || 'Error';
        const errorCode = error?.code || 'UNKNOWN';
        console.error(`[readiness] PostgreSQL check failed: ${errorName} (${errorCode})`);

        res.status(503).json({
            success: false,
            error: {
                code: 'SERVICE_UNAVAILABLE',
                message: 'Database is not available',
            },
        });
    }
});

// Versioned / Modular API routes
app.use('/api', apiRoutes);

// 404 & Global error handler
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
