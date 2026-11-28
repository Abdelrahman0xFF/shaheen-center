import { describe, expect, it } from 'vitest';
import { createStaffSchema, updateStaffSchema } from './staff.validator.js';

const base = {
    name: 'Marco',
    phone: '01006664444',
    role: 'BRANCH_MANAGER',
    branchIds: ['branch-1'],
    password: 'A_VALID_TEST_PASSWORD',
};

describe('staff.validator username email', () => {
    it('accepts a valid email and normalises trim + lowercase', () => {
        const parsed = createStaffSchema.parse({
            ...base,
            username: '  branch1@Example.com  ',
        });
        expect(parsed.username).toBe('branch1@example.com');
    });

    it('rejects malformed email addresses', () => {
        for (const username of [
            'branch1',
            'branch1@',
            '@example.com',
            'a b@x.com',
            'a@x',
            'a@@b.com',
        ]) {
            const result = createStaffSchema.safeParse({ ...base, username });
            expect(result.success, username).toBe(false);
            expect(JSON.stringify(result.error.issues)).toContain('البريد الإلكتروني غير صالح');
        }
    });

    it('treats omitted or null username as optional (no fabricated email)', () => {
        expect(createStaffSchema.parse({ ...base }).username).toBeUndefined();
        expect(createStaffSchema.parse({ ...base, username: null }).username).toBeNull();
    });

    it('accepts a valid intended staff payload shape', () => {
        const parsed = createStaffSchema.parse({
            name: 'Marco',
            phone: '01006664444',
            username: 'branch1@example.com',
            role: 'BRANCH_MANAGER',
            branchIds: ['EXISTING_BRANCH_ID'],
            password: 'A_VALID_TEST_PASSWORD',
        });
        expect(parsed.username).toBe('branch1@example.com');
    });

    it('applies email normalization on update too', () => {
        const parsed = updateStaffSchema.parse({ username: '  Branch1@Example.COM ' });
        expect(parsed.username).toBe('branch1@example.com');
    });
});
