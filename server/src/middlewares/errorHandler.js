import { ZodError } from 'zod';

export class ApiError extends Error {
    constructor(statusCode, message, code = 'API_ERROR', details = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}

export function notFoundHandler(req, _res, next) {
    next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND'));
}

export function errorHandler(err, _req, res, _next) {
    if (err instanceof ZodError) {
        const issues = err.issues || err.errors || [];
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'بيانات غير صالحة',
                details: issues.map((e) => ({
                    path: e.path.join('.'),
                    message: e.message,
                })),
            },
        });
    }

    // Prisma known unique constraint violation
    if (err?.code === 'P2002') {
        return res.status(409).json({
            success: false,
            error: {
                code: 'DUPLICATE_ENTRY',
                message: 'السجل موجود بالفعل',
                details: err.meta?.target || null,
            },
        });
    }

    // Prisma record not found
    if (err?.code === 'P2025') {
        return res.status(404).json({
            success: false,
            error: {
                code: 'RECORD_NOT_FOUND',
                message: 'السجل المطلوب غير موجود',
            },
        });
    }

    const statusCode = err.statusCode || 500;
    const code = err.code || 'INTERNAL_SERVER_ERROR';
    const message =
        statusCode === 500 && process.env.NODE_ENV === 'production'
            ? 'حدث خطأ داخلي في الخادم'
            : err.message || 'حدث خطأ غير متوقع';

    if (statusCode >= 500) {
        console.error('[API Error]', err);
    }

    return res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            ...(err.details ? { details: err.details } : {}),
        },
    });
}
