import { describe, it, expect } from 'vitest';
import { parseCookieHeader } from './cookies.js';

describe('parseCookieHeader', () => {
    it('parses normal', () => {
        expect(parseCookieHeader('a=1; b=2')).toEqual({ a: '1', b: '2' });
    });
    it('missing header', () => {
        expect(parseCookieHeader(undefined)).toEqual({});
    });
    it('malformed pairs skipped', () => {
        expect(parseCookieHeader('a=1; ; b=2; noeq')).toEqual({ a: '1', b: '2' });
    });
    it('decodes URI encoding; bad encoding kept raw', () => {
        expect(parseCookieHeader('a=%20').a).toBe(' ');
        expect(parseCookieHeader('a=%').a).toBe('%');
    });
});
