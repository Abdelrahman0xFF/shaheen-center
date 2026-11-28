# Authorization (Team contract)

## Roles

ADMIN, BRANCH_MANAGER, SECRETARY, INSTRUCTOR, STUDENT.

## Middleware order

`authenticate` → `authorizeRoles(...)` → `enforceBranchScope` → `validate(...)` → `verifyTrustedOrigin` (global) → controller. Every route requires `authenticate`. Writes/sensitive reads require `authorizeRoles`.

## Scope semantics

- `req.branchScope === null`: ADMIN, all branches.
- `req.branchScope: string[]`: manager/secretary assigned branches.
- `req.branchScope: []`: INSTRUCTOR/STUDENT; NOT branch-wide.
- `req.ownershipScope`: `INSTRUCTOR` / `STUDENT` / null.
- `req.user.instructorProfile.id`, `req.user.studentProfile.id` carried for ownership.

## Service patterns (`server/src/utils/branchAccess.js`, owned by Member 1)

- `applyAccessFilter(user, where, resource)` — top-level scope.
- `applyBranchFilterFor(user, where, resource)` — relation-aware branch filter.
- `applyOwnershipFilter(user, where, resource)` — INSTRUCTOR/STUDENT relation filter.
- `assertRecordAccess(user, record, { branchId, ownerUserId })`.
- `assertBranchAccess(user, branchId)`, `canAccessBranch`, `getBranchScope`, `getOwnershipScope`.

## Resource relation map

Group→Room→Branch; Session→Group (+Room); Enrollment→Student+Group; Attendance→Session+Student; Payment→Student+Branch; Course→Instructor; Instructor→User.

## 403 vs empty

- Explicit foreign target (branchId/studentId/groupId) in request → 403.
- List query outside scope → 200 empty.
- Single record exists but out of scope → 403.
- Record not found → 404.
- Role has no access → 403.

## Anti-patterns

Unscoped `findUnique({ id })`; `OR` bypassing scope; trusting client `branchId`; `applyBranchFilter` for instructor/student; consistent 403 policy.

## Role matrix

See plan §8 / generated docs. Admin all; manager/secretary assigned branches; instructor own groups/students; student own record. Staff & audit admin-only. Settings write admin-only.

## Audit

Every sensitive write calls `logAudit(...)` with sanitized `before`/`after`. Read-only AuditLog (ADMIN). Secrets redacted.
