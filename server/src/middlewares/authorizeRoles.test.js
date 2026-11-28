import { describe, expect, it, vi } from 'vitest';
import { authorizeRoles } from './authorizeRoles.js';

function makeReq(role) {
    return { user: role ? { role, isActive: true } : undefined };
}

function makeNext() {
    return vi.fn();
}

describe('authorizeRoles middleware', () => {
    it('rejects unauthenticated request with 401', () => {
        const req = makeReq(null);
        const next = makeNext();

        authorizeRoles('ADMIN')(req, null, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 401, code: 'UNAUTHORIZED' }),
        );
    });

    it('allows a role in the allowed list', () => {
        const req = makeReq('ADMIN');
        const next = makeNext();

        authorizeRoles('ADMIN', 'BRANCH_MANAGER')(req, null, next);

        expect(next).toHaveBeenCalledTimes(1);
    });

    it('rejects a role not in the allowed list with 403', () => {
        const req = makeReq('SECRETARY');
        const next = makeNext();

        authorizeRoles('ADMIN')(req, null, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 403, code: 'FORBIDDEN' }),
        );
    });
});
