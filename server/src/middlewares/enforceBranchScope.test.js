import { describe, expect, it, vi } from 'vitest';
import { enforceBranchScope } from './enforceBranchScope.js';

// Legacy helper — sets branchId only in params (for the original 7 tests).
function makeReq(user, branchId) {
    const req = { user, params: {}, query: {}, body: {} };
    if (branchId) req.params.branchId = branchId;
    return req;
}

// Extended helper — set branchId in any combination of sources.
function makeReqSources(user, { params = {}, query = {}, body = {} } = {}) {
    return { user, params, query, body };
}

function makeNext() {
    return vi.fn();
}

describe('enforceBranchScope middleware', () => {
    it('rejects unauthenticated request with 401', () => {
        const req = makeReq(undefined);
        const next = makeNext();

        enforceBranchScope(req, null, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 401, code: 'UNAUTHORIZED' }),
        );
    });

    it('sets branchScope null for ADMIN', () => {
        const req = makeReq({ role: 'ADMIN', id: 'a1', branchIds: [] });
        const next = makeNext();

        enforceBranchScope(req, null, next);

        expect(req.branchScope).toBe(null);
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('sets branchScope to assigned branches for BRANCH_MANAGER', () => {
        const req = makeReq({
            role: 'BRANCH_MANAGER',
            id: 'm1',
            branchIds: ['branch-1', 'branch-2'],
        });
        const next = makeNext();

        enforceBranchScope(req, null, next);

        expect(req.branchScope).toEqual(['branch-1', 'branch-2']);
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('rejects manager with no assigned branch with 403', () => {
        const req = makeReq({ role: 'BRANCH_MANAGER', id: 'm1', branchIds: [] });
        const next = makeNext();

        enforceBranchScope(req, null, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 403, code: 'NO_BRANCH_ASSIGNED' }),
        );
    });

    it('denies branch manager access to an unassigned branch with 403', () => {
        const req = makeReq(
            { role: 'BRANCH_MANAGER', id: 'm1', branchIds: ['branch-1'] },
            'branch-99',
        );
        const next = makeNext();

        enforceBranchScope(req, null, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 403, code: 'BRANCH_FORBIDDEN' }),
        );
    });

    it('allows branch manager access to an assigned branch', () => {
        const req = makeReq(
            { role: 'BRANCH_MANAGER', id: 'm1', branchIds: ['branch-1'] },
            'branch-1',
        );
        const next = makeNext();

        enforceBranchScope(req, null, next);

        expect(req.branchScope).toEqual(['branch-1']);
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('gives instructor an empty ownership scope (no branch-wide access)', () => {
        const req = makeReq({ role: 'INSTRUCTOR', id: 'i1', branchIds: [] });
        const next = makeNext();

        enforceBranchScope(req, null, next);

        expect(req.branchScope).toEqual([]);
        expect(req.ownershipScope).toBe('INSTRUCTOR');
        expect(next).toHaveBeenCalledTimes(1);
    });
});

// ─── HIGH-01 regression tests (multi-source branchId validation) ─────────────

describe('enforceBranchScope — HIGH-01 multi-source branchId regression', () => {
    const manager = { role: 'BRANCH_MANAGER', id: 'm1', branchIds: ['branch-1', 'branch-2'] };
    const secretary = { role: 'SECRETARY', id: 's1', branchIds: ['branch-1', 'branch-2'] };
    const admin = { role: 'ADMIN', id: 'adm1', branchIds: [] };
    const instructor = { role: 'INSTRUCTOR', id: 'i1', branchIds: [] };
    const student = { role: 'STUDENT', id: 'st1', branchIds: [] };

    function expectNoError(next) {
        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0]).toEqual([]);
    }

    function expectApiError(next, statusCode, code) {
        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode, code }));
    }

    describe.each([
        ['BRANCH_MANAGER', manager],
        ['SECRETARY', secretary],
    ])('%s multi-source authorization & validation', (_roleName, scopedUser) => {
        it('rejects authorized query + unauthorized body with 403 BRANCH_FORBIDDEN', () => {
            const req = makeReqSources(scopedUser, {
                query: { branchId: 'branch-1' },
                body: { branchId: 'branch-99' },
            });
            const next = makeNext();

            enforceBranchScope(req, null, next);

            expectApiError(next, 403, 'BRANCH_FORBIDDEN');
        });

        it('rejects authorized params + unauthorized query with 403 BRANCH_FORBIDDEN', () => {
            const req = makeReqSources(scopedUser, {
                params: { branchId: 'branch-1' },
                query: { branchId: 'branch-99' },
            });
            const next = makeNext();

            enforceBranchScope(req, null, next);

            expectApiError(next, 403, 'BRANCH_FORBIDDEN');
        });

        it('rejects authorized params + unauthorized body with 403 BRANCH_FORBIDDEN', () => {
            const req = makeReqSources(scopedUser, {
                params: { branchId: 'branch-1' },
                body: { branchId: 'branch-99' },
            });
            const next = makeNext();

            enforceBranchScope(req, null, next);

            expectApiError(next, 403, 'BRANCH_FORBIDDEN');
        });

        it('rejects when all three sources contain unauthorized IDs with 403 BRANCH_FORBIDDEN', () => {
            const req = makeReqSources(scopedUser, {
                params: { branchId: 'branch-97' },
                query: { branchId: 'branch-98' },
                body: { branchId: 'branch-99' },
            });
            const next = makeNext();

            enforceBranchScope(req, null, next);

            expectApiError(next, 403, 'BRANCH_FORBIDDEN');
        });

        it('rejects conflicting authorized branchIds across sources with 400 CONFLICTING_BRANCH_IDS', () => {
            const req = makeReqSources(scopedUser, {
                params: { branchId: 'branch-1' },
                query: { branchId: 'branch-2' },
            });
            const next = makeNext();

            enforceBranchScope(req, null, next);

            expectApiError(next, 400, 'CONFLICTING_BRANCH_IDS');
        });

        it('allows duplicate identical authorized branchIds across all three sources', () => {
            const req = makeReqSources(scopedUser, {
                params: { branchId: 'branch-1' },
                query: { branchId: 'branch-1' },
                body: { branchId: 'branch-1' },
            });
            const next = makeNext();

            enforceBranchScope(req, null, next);

            expectNoError(next);
        });

        it('allows requests with missing branchId across all sources', () => {
            const req = makeReqSources(scopedUser);
            const next = makeNext();

            enforceBranchScope(req, null, next);

            expect(req.branchScope).toEqual(['branch-1', 'branch-2']);
            expectNoError(next);
        });

        it('ignores undefined, null, and empty string values across sources', () => {
            const req = makeReqSources(scopedUser, {
                params: { branchId: undefined },
                query: { branchId: null },
                body: { branchId: '' },
            });
            const next = makeNext();

            enforceBranchScope(req, null, next);

            expectNoError(next);
        });

        it('allows valid branchId alongside ignored empty/null sources', () => {
            const req = makeReqSources(scopedUser, {
                params: { branchId: 'branch-1' },
                query: { branchId: '' },
                body: { branchId: null },
            });
            const next = makeNext();

            enforceBranchScope(req, null, next);

            expectNoError(next);
        });

        it('fails closed with 403 NO_BRANCH_ASSIGNED when branch scope is empty', () => {
            const unassignedUser = { role: scopedUser.role, id: 'u-empty', branchIds: [] };
            const req = makeReqSources(unassignedUser, {
                params: { branchId: 'branch-1' },
            });
            const next = makeNext();

            enforceBranchScope(req, null, next);

            expectApiError(next, 403, 'NO_BRANCH_ASSIGNED');
        });

        it('rejects object branchId in body with 400 INVALID_BRANCH_ID', () => {
            const req = makeReqSources(scopedUser, {
                body: { branchId: { $ne: null } },
            });
            const next = makeNext();

            enforceBranchScope(req, null, next);

            expectApiError(next, 400, 'INVALID_BRANCH_ID');
        });

        it('rejects null-prototype object branchId in query with 400 INVALID_BRANCH_ID', () => {
            const queryObj = Object.create(null);
            queryObj.$ne = '1';
            const req = makeReqSources(scopedUser, {
                query: { branchId: queryObj },
            });
            const next = makeNext();

            enforceBranchScope(req, null, next);

            expectApiError(next, 400, 'INVALID_BRANCH_ID');
        });

        it('rejects array branchId in query with 400 INVALID_BRANCH_ID', () => {
            const req = makeReqSources(scopedUser, {
                query: { branchId: ['branch-1', 'branch-99'] },
            });
            const next = makeNext();

            enforceBranchScope(req, null, next);

            expectApiError(next, 400, 'INVALID_BRANCH_ID');
        });

        it('rejects single-element array branchId in body with 400 INVALID_BRANCH_ID', () => {
            const req = makeReqSources(scopedUser, {
                body: { branchId: ['branch-1'] },
            });
            const next = makeNext();

            enforceBranchScope(req, null, next);

            expectApiError(next, 400, 'INVALID_BRANCH_ID');
        });

        it.each([
            ['whitespace-only string', '   '],
            ['padded string', ' branch-1'],
            ['path traversal string', '../branch-1'],
            ['control char string', 'branch-1\x00'],
            ['boolean false', false],
            ['boolean true', true],
            ['zero', 0],
            ['negative number', -1],
            ['float number', 1.5],
            ['NaN', Number.NaN],
            ['Infinity', Number.POSITIVE_INFINITY],
        ])('rejects malformed branchId (%s) with 400 INVALID_BRANCH_ID', (_label, badValue) => {
            const req = makeReqSources(scopedUser, {
                body: { branchId: badValue },
            });
            const next = makeNext();

            enforceBranchScope(req, null, next);

            expectApiError(next, 400, 'INVALID_BRANCH_ID');
        });

        it('accepts positive safe integer scalar branchId matching string scope', () => {
            const numericUser = { role: scopedUser.role, id: 'u-num', branchIds: ['42'] };
            const req = makeReqSources(numericUser, {
                params: { branchId: '42' },
                body: { branchId: 42 },
            });
            const next = makeNext();

            enforceBranchScope(req, null, next);

            expectNoError(next);
        });
    });

    describe('ADMIN access & validation', () => {
        it('allows ADMIN with missing branchId', () => {
            const req = makeReqSources(admin);
            const next = makeNext();

            enforceBranchScope(req, null, next);

            expect(req.branchScope).toBeNull();
            expectNoError(next);
        });

        it('allows ADMIN with valid branchId in any source', () => {
            const req = makeReqSources(admin, {
                params: { branchId: 'any-branch' },
            });
            const next = makeNext();

            enforceBranchScope(req, null, next);

            expect(req.branchScope).toBeNull();
            expectNoError(next);
        });

        it('allows ADMIN with identical branchId across multiple sources', () => {
            const req = makeReqSources(admin, {
                params: { branchId: 'branch-1' },
                query: { branchId: 'branch-1' },
                body: { branchId: 'branch-1' },
            });
            const next = makeNext();

            enforceBranchScope(req, null, next);

            expect(req.branchScope).toBeNull();
            expectNoError(next);
        });

        it('rejects ADMIN with conflicting branchIds across sources with 400 CONFLICTING_BRANCH_IDS', () => {
            const req = makeReqSources(admin, {
                params: { branchId: 'branch-1' },
                body: { branchId: 'branch-2' },
            });
            const next = makeNext();

            enforceBranchScope(req, null, next);

            expectApiError(next, 400, 'CONFLICTING_BRANCH_IDS');
        });

        it('rejects ADMIN with malformed object or array branchId with 400 INVALID_BRANCH_ID', () => {
            const reqObj = makeReqSources(admin, { body: { branchId: { $ne: null } } });
            const nextObj = makeNext();
            enforceBranchScope(reqObj, null, nextObj);
            expectApiError(nextObj, 400, 'INVALID_BRANCH_ID');

            const reqArr = makeReqSources(admin, { query: { branchId: ['branch-1', 'branch-2'] } });
            const nextArr = makeNext();
            enforceBranchScope(reqArr, null, nextArr);
            expectApiError(nextArr, 400, 'INVALID_BRANCH_ID');
        });
    });

    describe('INSTRUCTOR and STUDENT ownership-scoped behavior', () => {
        it.each([
            ['INSTRUCTOR', instructor],
            ['STUDENT', student],
        ])(
            'sets empty branchScope and ownershipScope for %s when no branchId is supplied',
            (role, user) => {
                const req = makeReqSources(user);
                const next = makeNext();

                enforceBranchScope(req, null, next);

                expect(req.branchScope).toEqual([]);
                expect(req.ownershipScope).toBe(role);
                expectNoError(next);
            },
        );

        it.each([
            ['INSTRUCTOR', instructor],
            ['STUDENT', student],
        ])('fails closed with 403 BRANCH_FORBIDDEN when %s supplies a branchId', (_role, user) => {
            const req = makeReqSources(user, { body: { branchId: 'branch-1' } });
            const next = makeNext();

            enforceBranchScope(req, null, next);

            expectApiError(next, 403, 'BRANCH_FORBIDDEN');
        });
    });

    it('treats blank strings inside user.branchIds as empty scope (fail closed)', () => {
        const corruptUser = { role: 'BRANCH_MANAGER', id: 'm-bad', branchIds: [''] };
        const req = makeReqSources(corruptUser, { params: { branchId: '' } });
        const next = makeNext();

        enforceBranchScope(req, null, next);

        expectApiError(next, 403, 'NO_BRANCH_ASSIGNED');
    });
});
