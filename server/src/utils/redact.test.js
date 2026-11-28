import { describe, it, expect } from 'vitest';
import { redactSensitive } from './redact.js';

describe('redactSensitive', () => {
    it('redacts sensitive keys', () => {
        const out = redactSensitive({
            password: 'x',
            token: 'y',
            nationalId: 'z',
            ok: 1,
            nested: { refreshToken: 'r', a: 2 },
        });
        expect(out.password).toBe('[REDACTED]');
        expect(out.token).toBe('[REDACTED]');
        expect(out.nationalId).toBe('[REDACTED]');
        expect(out.ok).toBe(1);
        expect(out.nested.refreshToken).toBe('[REDACTED]');
        expect(out.nested.a).toBe(2);
    });

    it('handles arrays and depth limits', () => {
        const deep = { a: { b: { c: { d: { e: 1 } } } } };
        expect(JSON.stringify(redactSensitive(deep))).toContain('[MAX_DEPTH]');
        expect(redactSensitive([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it('handles circular', () => {
        const o = {};
        o.self = o;
        expect(() => JSON.stringify(redactSensitive(o))).not.toThrow();
    });

    it('truncates long strings', () => {
        const long = 'a'.repeat(600);
        expect(redactSensitive(long).length).toBeLessThan(600);
    });
});
