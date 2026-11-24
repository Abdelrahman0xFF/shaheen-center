
import { ZodError } from 'zod';

export class ApiError extends Error {
    constructor(statusCode, message, code = 'API_ERROR', details = null) {
        super(message);

        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}

// Handles routes that do not exist
export function notFoundHandler(req, _res, next) {
    next(
        new ApiError(
            404,
            `Route not found: ${req.method} ${req.originalUrl}`,
            'NOT_FOUND'
        )
    );
}

// Global error handler
export function errorHandler(err, _req, res, next) {

    // If response was already sent, pass error to Express
    if (res.headersSent) {
        return next(err);
    }

    // Zod validation errors
    if (err instanceof ZodError) {
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
        return res.status(400).json({
            success: false,
            error: {
                code: 'INVALID_JSON',
                message: 'صيغة JSON غير صحيحة',
            },
        });
    }

    // Request body is too large
    if (err?.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            error: {
                code: 'PAYLOAD_TOO_LARGE',
                message: 'حجم البيانات أكبر من المسموح',
            },
        });
    }

    // Prisma: Unique constraint violation
    if (err?.code === 'P2002') {
        return res.status(409).json({
            success: false,
            error: {
                code: 'DUPLICATE_ENTRY',
                message: 'السجل موجود بالفعل',
            },
        });
    }

    // Prisma: Record not found
    if (err?.code === 'P2025') {
        return res.status(404).json({
            success: false,
            error: {
                code: 'RECORD_NOT_FOUND',
                message: 'السجل المطلوب غير موجود',
            },
        });
    }

    const statusCode = Number.isInteger(err.statusCode)
        ? err.statusCode
        : 500;

    const code = err.code || 'INTERNAL_SERVER_ERROR';

    const isProduction = process.env.NODE_ENV === 'production';

    const message =
        statusCode >= 500 && isProduction
            ? 'حدث خطأ داخلي في الخادم'
            : err.message || 'حدث خطأ غير متوقع';

    // Log server-side errors
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
