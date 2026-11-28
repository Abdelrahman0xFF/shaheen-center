import { describe, expect, it } from 'vitest';
import { normalizeEgyptianPhone, looksLikePhoneIdentifier } from './phone.js';

describe('phone utilities', () => {
    it.each([
        ['01012345678', '01012345678'],
        ['01123456789', '01123456789'],
        ['+201012345678', '01012345678'],
        ['00201012345678', '01012345678'],
        ['201012345678', '01012345678'],
        ['010-1234-5678', '01012345678'],
        ['  010 1234 5678  ', '01012345678'],
        ['(010)12345678', '01012345678'],
    ])('normalises %s to %s', (input, expected) => {
        expect(normalizeEgyptianPhone(input)).toBe(expected);
    });

    it.each([
        ['01912345678', null],
        ['0101234567', null],
        ['abc', null],
        ['', null],
        [null, null],
        [undefined, null],
    ])('rejects %s', (input, expected) => {
        expect(normalizeEgyptianPhone(input)).toBe(expected);
    });

    it.each([
        ['01012345678', true],
        ['+201012345678', true],
        ['0020 10 12345678', true],
        ['ahmed123', false],
        ['Ahmed.Ali', false],
        ['', false],
    ])('classifies %s as phone: %s', (input, expected) => {
        expect(looksLikePhoneIdentifier(input)).toBe(expected);
    });
});
