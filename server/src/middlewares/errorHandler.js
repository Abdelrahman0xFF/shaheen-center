import { ZodError } from 'zod';
import { redactSensitive } from '../utils/redact.js';

export class ApiError extends Error {
    constructor(statusCode, message, code = 'API_ERROR', details = null) {
        super(message);

        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}

const GENERIC_500 = 'حدث خطأ داخلي في الخادم';

// Prisma error code → { status, code, message }
const PRISMA_MAP = {
    P2002: [409, 'DUPLICATE_ENTRY', 'السجل موجود بالفعل'],
    P2003: [409, 'RELATED_RECORD_CONFLICT', 'لا يمكن إتمام العملية لوجود بيانات مرتبطة'],
    P2025: [404, 'RECORD_NOT_FOUND', 'السجل المطلوب غير موجود'],
    P2014: [409, 'RELATION_VIOLATION', 'لا يمكن إتمام العملية لوجود ارتباط غير صالح'],
    P2023: [400, 'INVALID_IDENTIFIER', 'معرف السجل غير صالح'],
    P2024: [503, 'SERVICE_UNAVAILABLE', 'الخدمة غير متاحة مؤقتاً'],
    P1001: [503, 'SERVICE_UNAVAILABLE', 'الخدمة غير متاحة مؤقتاً'],
    P1002: [503, 'SERVICE_UNAVAILABLE', 'الخدمة غير متاحة مؤقتاً'],
};

function isPrismaError(err) {
    return Boolean(
        err && typeof err === 'object' && typeof err.code === 'string' && /^P\d{4}$/.test(err.code),
    );
}

function safePath(p) {
    const value = String(p || '');
    return value.length > 200 ? value.slice(0, 200) : value;
}

function structuredLog(level, fields) {
    // Only safe, explicit fields are logged. Never log bodies/query/headers/cookies/tokens.
    const safe = {
        level,
        requestId: fields.requestId || null,
        method: fields.method || null,
        path: safePath(fields.path),
        status: fields.status ?? null,
        code: fields.code || null,
        errorName: fields.errorName || null,
        prismaCode: fields.prismaCode || null,
        userId: fields.userId || null,
    };
    const line = JSON.stringify(redactSensitive(safe));
    if (level === 'error') console.error(line);
    else console.warn(line);
}

// Handles routes that do not exist
export function notFoundHandler(req, _res, next) {
    next(new ApiError(404, `Route not found: ${req.method} ${safePath(req.path)}`, 'NOT_FOUND'));
}

// Global error handler
export function errorHandler(err, req, res, next) {
    // If response was already sent, pass error to Express
    if (res.headersSent) {
        return next(err);
    }

    const isProduction = (process.env.NODE_ENV || req.app?.get?.('env')) === 'production';
    const requestId = req.id || res.locals?.requestId || null;
    const userId = req.user?.id || null;
    const base = { requestId, method: req.method, path: req.path, userId };

    // Zod validation errors
    if (err instanceof ZodError) {
        structuredLog('warn', {
            ...base,
            status: 400,
            code: 'VALIDATION_ERROR',
            errorName: 'ZodError',
        });
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'بيانات غير صالحة',
                details: err.issues.map((issue) => ({
                    path: issue.path.join('.'),
                    message: issue.message,
                })),
            },
        });
    }

    // Invalid JSON sent by client
    if (err?.type === 'entity.parse.failed') {
        structuredLog('warn', {
            ...base,
            status: 400,
            code: 'INVALID_JSON',
            errorName: 'SyntaxError',
        });
        return res.status(400).json({
            success: false,
            error: { code: 'INVALID_JSON', message: 'صيغة JSON غير صحيحة' },
        });
    }

    // Request body is too large
    if (err?.type === 'entity.too.large') {
        structuredLog('warn', {
            ...base,
            status: 413,
            code: 'PAYLOAD_TOO_LARGE',
            errorName: err.name,
        });
        return res.status(413).json({
            success: false,
            error: { code: 'PAYLOAD_TOO_LARGE', message: 'حجم البيانات أكبر من المسموح' },
        });
    }

    // Prisma errors
    if (isPrismaError(err)) {
        const mapped = PRISMA_MAP[err.code];
        if (mapped) {
            const [status, code, message] = mapped;
            structuredLog(status >= 500 ? 'error' : 'warn', {
                ...base,
                status,
                code,
                errorName: err.name,
                prismaCode: err.code,
            });
            return res.status(status).json({ success: false, error: { code, message } });
        }

        // Unknown Prisma → generic 500
        structuredLog('error', {
            ...base,
            status: 500,
            code: 'INTERNAL_SERVER_ERROR',
            errorName: err.name,
            prismaCode: err.code,
        });
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: GENERIC_500 },
        });
    }

    const statusCode = Number.isInteger(err.statusCode) ? err.statusCode : 500;
    const code = err.code || 'INTERNAL_SERVER_ERROR';
    const isServerError = statusCode >= 500;

    const message = isServerError
        ? isProduction
            ? GENERIC_500
            : err.message || GENERIC_500
        : err.message || 'حدث خطأ غير متوقع';

    structuredLog(isServerError ? 'error' : 'warn', {
        ...base,
        status: statusCode,
        code,
        errorName: err.name || 'Error',
    });

    // details only for explicitly safe ApiError details (validation etc.)
    const safeDetails =
        !isServerError && err instanceof ApiError && err.details
            ? redactSensitive(err.details)
            : null;

    return res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            ...(safeDetails ? { details: safeDetails } : {}),
        },
    });
}
