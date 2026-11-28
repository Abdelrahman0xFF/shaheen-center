import { describe, expect, it } from 'vitest';
import { cairoDateEndUtc, cairoDateStartUtc } from './dateTime.js';

describe('Africa/Cairo calendar-day boundaries', () => {
    it('converts a winter date to UTC+2 boundaries', () => {
        expect(cairoDateStartUtc('2026-11-27').toISOString()).toBe('2026-11-26T22:00:00.000Z');
        expect(cairoDateEndUtc('2026-11-27').toISOString()).toBe('2026-11-27T21:59:59.999Z');
    });

    it('converts a summer date to UTC+3 boundaries', () => {
        expect(cairoDateStartUtc('2026-07-15').toISOString()).toBe('2026-07-14T21:00:00.000Z');
        expect(cairoDateEndUtc('2026-07-15').toISOString()).toBe('2026-07-15T20:59:59.999Z');
    });

    it('handles the DST-start day (23 hours)', () => {
        expect(cairoDateStartUtc('2026-04-24').toISOString()).toBe('2026-04-23T22:00:00.000Z');
        expect(cairoDateEndUtc('2026-04-24').toISOString()).toBe('2026-04-24T20:59:59.999Z');
    });

    it('handles the DST-end day (25 hours)', () => {
        expect(cairoDateStartUtc('2026-10-29').toISOString()).toBe('2026-10-28T21:00:00.000Z');
        expect(cairoDateEndUtc('2026-10-29').toISOString()).toBe('2026-10-29T21:59:59.999Z');
    });

    it('rejects malformed and impossible dates', () => {
        expect(cairoDateStartUtc('27-11-2026')).toBeNull();
        expect(cairoDateStartUtc('2026-02-31')).toBeNull();
        expect(cairoDateStartUtc('')).toBeNull();
        expect(cairoDateEndUtc('not-a-date')).toBeNull();
    });
});
