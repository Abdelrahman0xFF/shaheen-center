import { describe, expect, it } from 'vitest';
import {
    BRANCH_SCOPED_ROLES,
    OWNERSHIP_SCOPED_ROLES,
    applyBranchFilter,
    assertBranchAccess,
    canAccessBranch,
    getBranchScope,
    assertOwnership,
    assertStudentOwnsRecord,
    assertInstructorOwnsProfile,
} from './branchAccess.js';

const branchIds = ['branch-1', 'branch-2'];

const admin = { role: 'ADMIN', id: 'admin-1', branchIds: [] };
const manager = { role: 'BRANCH_MANAGER', id: 'm1', branchIds };
const secretary = { role: 'SECRETARY', id: 's1', branchIds };
const instructor = { role: 'INSTRUCTOR', id: 'instr-1', branchIds: [] };
const student = { role: 'STUDENT', id: 'stud-1', branchIds: [] };

describe('branch access utilities', () => {
    describe('getBranchScope', () => {
        it('returns null for ADMIN (all branches)', () => {
            expect(getBranchScope(admin)).toBe(null);
        });

        it('returns assigned branch IDs for BRANCH_MANAGER', () => {
            expect(getBranchScope(manager)).toEqual(branchIds);
        });

        it('returns assigned branch IDs for SECRETARY', () => {
            expect(getBranchScope(secretary)).toEqual(branchIds);
        });

        it('returns empty array for INSTRUCTOR', () => {
            expect(getBranchScope(instructor)).toEqual([]);
        });

        it('returns empty array for STUDENT', () => {
            expect(getBranchScope(student)).toEqual([]);
        });
    });

    describe('BRANCH_SCOPED_ROLES constant', () => {
        it('lists the branch-scoped roles', () => {
            expect(BRANCH_SCOPED_ROLES).toContain('BRANCH_MANAGER');
            expect(BRANCH_SCOPED_ROLES).toContain('SECRETARY');
        });
    });

    describe('OWNERSHIP_SCOPED_ROLES constant', () => {
        it('lists the ownership-scoped roles', () => {
            expect(OWNERSHIP_SCOPED_ROLES).toContain('INSTRUCTOR');
            expect(OWNERSHIP_SCOPED_ROLES).toContain('STUDENT');
        });
    });

    describe('canAccessBranch', () => {
        it('allows ADMIN for any branch', () => {
            expect(canAccessBranch(admin, 'branch-99')).toBe(true);
        });

        it('allows manager for assigned branches', () => {
            expect(canAccessBranch(manager, 'branch-1')).toBe(true);
        });

        it('denies manager for unassigned branches', () => {
            expect(canAccessBranch(manager, 'branch-99')).toBe(false);
        });

        it('denies manager when no branch assigned', () => {
            expect(canAccessBranch(instructor, 'branch-1')).toBe(false);
        });
    });

    describe('assertBranchAccess', () => {
        it('allows ADMIN', () => {
            expect(assertBranchAccess(admin, 'branch-99')).toBe(true);
        });

        it('allows assigned branch', () => {
            expect(assertBranchAccess(manager, 'branch-1')).toBe(true);
        });

        it('throws 403 for unassigned branch', () => {
            expect(() => assertBranchAccess(manager, 'branch-99')).toThrow(
                /لا يمكنك الوصول لبيانات هذا الفرع/,
            );
        });
    });

    describe('applyBranchFilter', () => {
        it('does not filter for ADMIN', () => {
            expect(applyBranchFilter(admin, { name: 'x' })).toEqual({
                name: 'x',
            });
        });

        it('overrides caller-supplied branch filter for scoped roles', () => {
            const result = applyBranchFilter(manager, { branchId: 'branch-99' });
            expect(result.branchId).toEqual({ in: branchIds });
        });

        it('applies branch filter where none existed', () => {
            expect(applyBranchFilter(secretary, {}, 'branchId')).toEqual({
                branchId: { in: branchIds },
            });
        });
    });

    describe('assertOwnership helpers', () => {
        it('allows the owner itself', () => {
            expect(assertOwnership(student, 'stud-1')).toBe(true);
        });

        it('denies a different user', () => {
            expect(() => assertOwnership(student, 'stud-2')).toThrow(
                /لا يمكنك الوصول إلى هذا السجل/,
            );
        });

        it('allows privileged roles through allowRoles', () => {
            expect(assertOwnership(admin, 'stud-2', { allowRoles: ['ADMIN'] })).toBe(true);
        });

        it('assertStudentOwnsRecord allows ADMIN/manager/secretary', () => {
            expect(assertStudentOwnsRecord(admin, 'stud-9')).toBe(true);
            expect(assertStudentOwnsRecord(manager, 'stud-9')).toBe(true);
            expect(assertStudentOwnsRecord(secretary, 'stud-9')).toBe(true);
        });

        it('assertInstructorOwnsProfile allows ADMIN/manager', () => {
            expect(assertInstructorOwnsProfile(admin, 'instr-9')).toBe(true);
            expect(assertInstructorOwnsProfile(manager, 'instr-9')).toBe(true);
            expect(() => assertInstructorOwnsProfile(secretary, 'instr-9')).toThrow(
                /لا يمكنك الوصول إلى هذا السجل/,
            );
        });
    });
});
