import { describe, it, expect } from 'vitest';
import { getClientIp, getUserAgent, getRequestOrigin } from './requestContext.js';

describe('requestContext', () => {
    it('IPv4-mapped IPv6 normalized', () => {
        expect(getClientIp({ ip: '::ffff:127.0.0.1' })).toBe('127.0.0.1');
    });
    it('missing ip -> null', () => {
        expect(getClientIp({})).toBeNull();
    });
    it('UA control chars stripped + truncated', () => {
        const ua = `a${'\n'}b`.repeat(200);
        const out = getUserAgent({ headers: { 'user-agent': ua } });
        expect(out).not.toContain('\n');
        expect(out.length).toBeLessThanOrEqual(255);
    });
    it('origin from referer; malformed referer -> null', () => {
        expect(getRequestOrigin({ headers: { referer: 'http://x.com/path' } })).toBe(
            'http://x.com',
        );
        expect(getRequestOrigin({ headers: { referer: 'not a url' } })).toBeNull();
    });
});
