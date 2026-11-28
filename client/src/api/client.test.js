import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, authSession, refreshAccessToken } from './client';

const REFRESH_PAYLOAD = { data: { accessToken: 'new-access-token', user: null } };

function okResponse(config) {
    return {
        data: REFRESH_PAYLOAD,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
    };
}

function headerValue(headers, name) {
    if (!headers) return undefined;
    if (typeof headers.get === 'function') return headers.get(name);
    return headers[name] ?? headers[name.toLowerCase()];
}

describe('refresh request format', () => {
    let originalAdapter;
    let captured;

    beforeEach(() => {
        originalAdapter = apiClient.defaults.adapter;
        captured = [];
        authSession.clear();
    });

    afterEach(() => {
        apiClient.defaults.adapter = originalAdapter;
        authSession.clear();
        vi.useRealTimers();
    });

    it('sends an empty JSON object with Content-Type application/json', async () => {
        apiClient.defaults.adapter = (config) => {
            captured.push(config);
            return Promise.resolve(okResponse(config));
        };

        await refreshAccessToken();

        expect(captured).toHaveLength(1);
        const [req] = captured;
        expect(req.method).toBe('post');
        expect(String(req.url)).toMatch(/\/auth\/refresh$/);
        // A valid empty JSON object, never `null` / `undefined`.
        expect(req.data).toBe('{}');
        expect(JSON.parse(req.data)).toEqual({});
        expect(String(headerValue(req.headers, 'Content-Type'))).toContain('application/json');
        // `skipAuth` so no Bearer token is attached; cookie carries the session.
        expect(req.skipAuth).toBe(true);
        expect(headerValue(req.headers, 'Authorization')).toBeUndefined();
    });

    it('the shared Axios instance defaults Content-Type to application/json', () => {
        expect(headerValue(apiClient.defaults.headers, 'Content-Type')).toBe('application/json');
    });

    it('uses the same empty-object payload on the REFRESH_RACE retry path', async () => {
        vi.useFakeTimers();
        let calls = 0;
        apiClient.defaults.adapter = (config) => {
            calls += 1;
            captured.push(config);
            if (calls === 1) {
                const error = new Error('race');
                error.response = { status: 401, data: { error: { code: 'REFRESH_RACE' } } };
                error.config = config;
                return Promise.reject(error);
            }
            return Promise.resolve(okResponse(config));
        };

        const promise = refreshAccessToken();
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(calls).toBe(2);
        expect(result.accessToken).toBe('new-access-token');
        expect(captured.map((c) => c.data)).toEqual(['{}', '{}']);
        expect(captured.map((c) => c.method)).toEqual(['post', 'post']);
    });
});
