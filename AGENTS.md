# AGENTS.md — Shaheen Center Management System (`سنتر شاهين`)

This file defines the mandatory architectural rules, security invariants, folder boundaries, and workflows for all developers and AI coding agents contributing to this repository.

---

## 1. Project Context & Stack

- **Reference Spec:** `Software Requirements Specification.pdf` (SRS v1.0).
- **Architecture:** Monorepo with **Vertical Slices** across 5 team members.
- **Frontend (`client/`):** React 19, Vite, Tailwind CSS v4, React Router v7, Axios, Lucide React. **Arabic RTL-first (`dir="rtl" lang="ar"`), mobile-first PWA.**
- **Backend (`server/`):** Node.js (ESM `"type": "module"`), Express 4, Prisma ORM, PostgreSQL, Zod validation, JWT (`access` + `refresh`), `bcryptjs`.
- **Testing:** Vitest (Node for `server/`, jsdom + React Testing Library for `client/`). See [docs/TESTING.md](./docs/TESTING.md).
- **MVP Deferrals:** BullMQ/Redis queues, cron schedulers, offline IndexedDB sync, and Docker deployment are deferred to Post-MVP. Do **not** introduce Redis dependencies in MVP code.

---

## 2. Hard Invariants (NEVER Violate)

1. **Timestamps & Currency (`NFR-DAT-02`, `UI-01`):**
    - Store **all** timestamps in **UTC** in PostgreSQL.
    - Format dates/times for display in **`Africa/Cairo`** timezone.
    - Store **all** monetary amounts as Prisma `Decimal(10, 2)` (never `Float` or `Int` floats) and format in **EGP (`ج.م`)**.
2. **National ID Privacy (`FR-STU-05`, `NFR-SEC-03`, `AC-06`):**
    - **Never** store raw National IDs in plaintext. Always encrypt using `server/src/utils/encryption.js` (`encryptSensitive()` → AES-256-GCM) and store a keyed HMAC blind index (`createBlindIndex()`) for Admin search & duplicate detection.
    - **Never** return `nationalId`, `nationalIdEncrypted`, or `nationalIdImageUrl` to non-`ADMIN` roles. Strip them in the service layer for all roles except `ADMIN`.
3. **Soft Delete Only (`FR-STU-08`, `FR-PAY-08`, `NFR-DAT-01`):**
    - **Never** hard-delete `Student` or `Payment` rows (`prisma.student.delete` / `prisma.payment.delete` are forbidden).
    - Students use `deletedAt`. Always filter `deletedAt: null` on active student queries.
    - Payments use `status: 'VOIDED'`, `voidedAt`, `voidReason` (or linked reversal entry).
4. **Immutable Audit Log (`FR-RPT-02`, `FR-RPT-03`, `NFR-DAT-03`):**
    - Always call `logAudit({ userId, action, entity, entityId, before, after })` from `server/src/utils/auditLogger.js` for: manual attendance, QR token regeneration, capacity overrides, payment creation/voiding, cash closing confirmation, staff changes, and student soft-delete.
    - Never expose `UPDATE` or `DELETE` endpoints for `AuditLog`. Only `ADMIN` can read it.
5. **Branch Isolation (`FR-AUTH-04`):**
    - `BRANCH_MANAGER` and `SECRETARY` must **only** access records belonging to their assigned `UserBranch` branch IDs.
    - Always apply `enforceBranchScope` middleware and filter Prisma queries using `req.branchScope` (which is `null` for `ADMIN` meaning all branches, or `string[]` of allowed branch IDs).
6. **Non-Blocking Notifications (`FR-NTF-01`, `FR-NTF-13`, `AC-03`):**
    - Never call external WhatsApp/Zagel HTTP APIs synchronously inside a user request (especially `POST /api/attendance/scan`).
    - Always call `enqueueNotification(...)` in `server/src/services/notification.service.js` with a deterministic `idempotencyKey`.
7. **QR Security & Performance (`FR-STU-02`, `FR-ATT-03`, `NFR-PERF-01`, `AC-01`, `AC-02`):**
    - QR tokens must be cryptographically random (`crypto.randomBytes(24).toString('base64url')`), never derived from National ID or sequential IDs.
    - Attendance enforces `@@unique([sessionId, studentId])` in PostgreSQL to guarantee one-time use per session.
    - Keep `POST /api/attendance/scan` lean and indexed so p95 latency stays **< 1 second**.

---

## 3. Team Ownership & Anti-Conflict Boundaries

Each member works on their own vertical slice files to minimize Git merge conflicts:

| Member          | Backend Files (`routes/`, `controllers/`, `services/`)                                            | Frontend Pages (`client/src/pages/`)                                |
| :-------------- | :------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------ |
| **M1 — Ezzat**  | `auth`, `staff`, `branches`, `rooms`, `calendar`, `settings`, `audit` + `middlewares/` + `utils/` | `LoginPage`, `admin/*`, `layouts/MainLayout`, `context/AuthContext` |
| **M2 — George** | `instructors`, `courses`, `groups`, `sessions`                                                    | `academic/*`                                                        |
| **M3 — Marco**  | `students`, `enrollments`                                                                         | `students/*`                                                        |
| **M4 — Mazen**  | `attendance`                                                                                      | `attendance/*`                                                      |
| **M5 — 3ATEF**  | `payments`, `closings`, `notifications`, `dashboard`                                              | `finance/*`, shared `QuickPaymentModal`                             |

**Shared files rule:** Avoid casual edits to `server/src/app.js`, `server/src/routes/index.js`, `client/src/App.jsx`, `client/src/index.css`, or `server/prisma/schema.prisma`. Coordinate in team chat before opening a PR touching shared files.

---

## 4. Backend Conventions (`server/`)

- **Layered flow:** `route` → `middlewares (authenticate, authorizeRoles, enforceBranchScope, validate)` → `controller` (HTTP req/res only) → `service` (business logic & Prisma calls).
- **Never write Prisma queries directly inside controllers.**
- **Standard API Envelope (`utils/response.js`):**
    - Success: `{ "success": true, "message": "...", "data": ..., "meta": { "page": 1, "limit": 20, "total": 100 } }`
    - Error: `{ "success": false, "error": { "code": "CONFLICT_ERROR", "message": "...", "details": [...] } }`
- **Error Handling:** Throw `new ApiError(statusCode, message, code, details)` inside services/controllers; wrap route handlers with `asyncHandler()`.
- **Validation:** Validate `body`, `query`, and `params` using Zod schemas + `validate()` middleware.
- **Pagination (`FR-GEN-01`, `NFR-PERF-02`):** Every list endpoint must accept `?page=1&limit=20&search=...` (max limit `100`).

---

## 5. Database & Prisma Migration Rules

Read [docs/DB_MIGRATIONS.md](./docs/DB_MIGRATIONS.md) before modifying `schema.prisma`.

### Creating a New Migration (Editing the DB)

1. **Pull latest `main` first** (`git pull origin main`) so your migration sits cleanly on top of teammates' migrations.
2. **Edit `server/prisma/schema.prisma`** (add/modify models, columns, relations, or indexes).
3. **Validate the schema:**
    ```bash
    npm run db:validate
    ```
4. **Generate & apply the migration (also regenerates `@prisma/client`):**
    ```bash
    cd server
    npx prisma migrate dev --name <member_descriptive_name>
    ```
    _(Example: `npx prisma migrate dev --name m3_add_student_address`.)_
5. **For sensitive changes (e.g., renaming a column without data loss), preview SQL first:**
    ```bash
    cd server
    npx prisma migrate dev --create-only --name <descriptive_name>
    # review/edit the generated migration.sql, then apply:
    npx prisma migrate dev
    ```
6. **Commit BOTH `server/prisma/schema.prisma` AND `server/prisma/migrations/` together** after running `npm run verify`.

### Applying Teammates' Migrations (After Pulling `main`)

```bash
git pull origin main
cd server
npx prisma migrate dev
```

### Hard Anti-Conflict Rules

- **NEVER** use `npx prisma db push` on shared branches — it mutates your local DB without creating a migration file for teammates.
- **NEVER** edit or delete an already-committed migration file in `server/prisma/migrations/` — always create a new forward migration instead.
- Always run `npm run db:validate` before committing schema edits.

---

## 6. Frontend & UI Conventions (`client/`)

Read [docs/UI_DESIGN_SYSTEM.md](./docs/UI_DESIGN_SYSTEM.md) before building UI components.

- **RTL Logical Classes Only:** Use `ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`, `text-start`, `text-end` instead of `pl-`, `pr-`, `ml-`, `mr-`, `left-`, `right-`.
- **Design Tokens:** Use Tailwind theme tokens defined in `client/src/index.css` (`brand-*`, `surface-*`, `status-*`) rather than arbitrary hex codes.
- **Accessibility (`NFR-USE-02`):** Never indicate Paid/Due or Present/Absent by color alone — always combine **color + icon + clear Arabic text**.
- **Shared Components:** Reuse `client/src/components/ui/*` (`Button`, `Card`, `Badge`, `Input`, `Select`, `Modal`, `Table`, `PageHeader`, `EmptyState`).
- **API Calls:** Always use the shared Axios client in `client/src/api/client.js`.

---

## 7. Git, Task Tracking & Mandatory Verification Gate

- **Branch naming:** `feat/<member>-<slice>` (e.g., `feat/marco-students-crud`, `fix/mazen-scan-duplicate`).
- **Commit messages:** Conventional commits (`feat(attendance): enforce one-time QR scan per session`).
- **Task Tracking:** Update your checkboxes in `tasks/0X-<name>.md` as part of the PR that completes each task.

### Mandatory Verification Before Finishing Any Task or PR

**Every developer and AI coding agent MUST run these checks after editing code and fix every failure before reporting a task done or opening a PR:**

1. **Auto-format all changed files:**
    ```bash
    npm run format
    ```
2. **Run the full verification gate:**
    ```bash
    npm run verify
    ```
    This runs all 4 mandatory checks in sequence:
    - `npm run format:check` — Confirms Prettier formatting matches `.prettierrc.json` across the repo.
    - `npm run db:validate` — Validates `server/prisma/schema.prisma` syntax, relations, and indexes.
    - `npm run check:server` — Imports and boots `server/src/app.js` to catch ESM import, syntax, and wiring errors.
    - `npm run build:client` — Runs `vite build` to confirm React, JSX, and Tailwind v4 compile with zero errors.
3. **Run unit tests (mandatory for any business-logic change):**
    ```bash
    npm run test:unit
    ```
    - Every new/changed service, validator, middleware, util, or client component/hook must ship colocated `*.test.js(x)` tests (see [§8](#8-testing-standards-unit-tests) and `docs/TESTING.md`).
    - If your checkout has not scaffolded the Vitest runner yet, follow `docs/TESTING.md` §2 once, commit the setup in its own PR, then run this step.
4. **Database Client Sync (whenever `schema.prisma` changed):**
    - Run `npm run db:generate` and create a proper migration (`npx prisma migrate dev --name <name>`).
5. **Functional & Runtime Verification (whenever routes, services, or UI flows changed):**
    - Start the server and confirm `/api/health` returns `200 OK`.
    - Test the added/modified endpoints (happy path + validation error + RBAC/branch-scope `403` check).
    - Verify affected frontend pages render cleanly in Arabic RTL with zero browser console or network errors.
    - Re-check SRS Acceptance Criteria (`AC-01`..`AC-06`) relevant to your slice.

**Never mark a task complete if `npm run verify` fails, if `npm run test:unit` fails, or if runtime checks were skipped.**

---

## 8. Testing Standards (Unit Tests)

Read [docs/TESTING.md](./docs/TESTING.md) before writing tests.

- **Runner:** Vitest. Server tests run in Node; client tests run in jsdom with React Testing Library. No other runner is allowed without team agreement.
- **Location:** Tests are **colocated** with the code they cover (`auth.service.test.js` next to `auth.service.js`). Shared helpers live in `server/src/test/` and `client/src/test/`. Do not create a parallel top-level test tree.
- **Ownership:** You own the tests for your vertical slice (same file map as §3). Do not edit another member's tests without coordinating in team chat.
- **Mandatory:** Any PR that adds or changes service, validator, middleware, utility, or client hook/component logic MUST include unit tests covering its decision branches. A PR without them is not complete.
- **No real I/O:** Unit tests must never hit PostgreSQL, HTTP, or the filesystem. Mock `prisma` (`vi.mock('../config/prisma.js')`) and `logAudit`; mock Axios for client tests. Integration/Supertest tests are a separate phase.
- **Deterministic time:** Use `vi.useFakeTimers()` / `vi.setSystemTime()` for lockout, expiry, late-threshold, and closing-date logic. Never depend on the host clock or host timezone.
- **Critical invariants:** Each slice must have one dedicated test per invariant it owns (national-ID stripping for non-admins, soft-delete only, branch isolation, audit logging, notification idempotency, one scan per session, EGP/Decimal money, UTC→`Africa/Cairo` display). See `docs/TESTING.md` §4.1.
- **Accessibility assertions:** Assert accessible text, `role`, and Arabic labels — never Tailwind class names or colour alone (`NFR-USE-02`).
- **Coverage:** Report it in the PR; do not game it. Every branch (including early returns) in a service needs a case.
