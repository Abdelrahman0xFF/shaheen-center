import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorHandler, ApiError } from './errorHandler.js';

function mockRes() {
    return {
        headersSent: false,
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        locals: {},
    };
}

describe('errorHandler', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('maps P2002 -> 409 DUPLICATE_ENTRY', () => {
        const res = mockRes();
        errorHandler(
            { name: 'PrismaClientKnownRequestError', code: 'P2002' },
            { method: 'POST', path: '/x' },
            res,
            vi.fn(),
        );
        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json.mock.calls[0][0].error.code).toBe('DUPLICATE_ENTRY');
    });

    it('maps P2025 -> 404', () => {
        const res = mockRes();
        errorHandler(
            { name: 'PrismaClientKnownRequestError', code: 'P2025' },
            { method: 'POST', path: '/x' },
            res,
            vi.fn(),
        );
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('maps P2023 -> 400', () => {
        const res = mockRes();
        errorHandler({ name: 'X', code: 'P2023' }, { method: 'GET', path: '/x' }, res, vi.fn());
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('maps P2024 -> 503', () => {
        const res = mockRes();
        errorHandler({ name: 'X', code: 'P2024' }, { method: 'GET', path: '/x' }, res, vi.fn());
        expect(res.status).toHaveBeenCalledWith(503);
    });

    it('unknown error -> 500 generic in production; no secret in logs', () => {
        const prev = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        const res = mockRes();
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        errorHandler(
            new Error('boom password=hunter2 token=abc'),
            { method: 'POST', path: '/x', id: 'req-12345678' },
            res,
            vi.fn(),
        );
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json.mock.calls[0][0].error.message).not.toContain('hunter2');
        const logged = spy.mock.calls.map((c) => String(c[0])).join(' ');
        expect(logged).not.toContain('hunter2');
        expect(logged).not.toContain('abc');
        process.env.NODE_ENV = prev;
    });

    it('ApiError passes message + safe details', () => {
        const res = mockRes();
        errorHandler(
            new ApiError(400, 'بيانات غير صالحة', 'VALIDATION_ERROR', [
                { path: 'x', message: 'y' },
            ]),
            { method: 'POST', path: '/x' },
            res,
            vi.fn(),
        );
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].error.details).toEqual([{ path: 'x', message: 'y' }]);
    });
});
