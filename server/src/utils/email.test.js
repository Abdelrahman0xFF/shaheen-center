import { describe, expect, it } from 'vitest';
import { normalizeEmail } from './email.js';

describe('normalizeEmail', () => {
    it('trims whitespace and lowercases', () => {
        expect(normalizeEmail('  Branch1@Example.COM \n')).toBe('branch1@example.com');
    });
    it('handles null/undefined', () => {
        expect(normalizeEmail(null)).toBe('');
        expect(normalizeEmail(undefined)).toBe('');
    });
});
