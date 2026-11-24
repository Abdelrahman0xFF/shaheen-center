# Testing Guide — Unit Tests (Vitest)

This document defines the testing strategy for the Shaheen Center MVP. It complements the mandatory runtime checks in [AGENTS.md](../AGENTS.md#7-git-task-tracking--mandatory-verification-gate) — unit tests prove **logic**, runtime/Postman checks prove **integration**.

> **Status:** the runner is **not scaffolded yet** (repo currently has zero tests). Follow §2 once, commit the setup as its own PR, then every slice adds tests alongside its code.

---

## 1. Why unit tests here

The MVP has invariants that are cheap to break and expensive to debug:

- National ID encryption + role stripping (`AC-06`)
- Soft-delete only for Students/Payments
- Branch isolation for `BRANCH_MANAGER` / `SECRETARY` (`FR-AUTH-04`)
- Immutable audit logging on sensitive writes (`FR-RPT-02`)
- Idempotent notifications (`FR-NTF-13`, `AC-05`)
- One QR scan per session (`AC-02`)
- Lateness threshold + UTC→`Africa/Cairo` display (`NFR-DAT-02`)
- Decimal money, never float (`UI-01`)

Unit tests lock these down without needing PostgreSQL, a running server, or a browser.

---

## 2. One-Time Scaffolding (Do This First)

### 2.1 Install (server)

```bash
npm --prefix server install -D vitest @vitest/coverage-v8
```

Create `server/vitest.config.js`:

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.js'],
        setupFiles: ['src/test/setup.js'],
        clearMocks: true,
        restoreMocks: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            include: ['src/**/*.js'],
            exclude: ['src/test/**', 'src/**/*.test.js'],
        },
    },
});
```

Create `server/src/test/setup.js`:

```js
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret';
// Unit tests never connect to PostgreSQL; DATABASE_URL only needs to be syntactically valid.
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost:5432/test';
```

Add to `server/package.json`:

```json
"test:unit": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

### 2.2 Install (client)

```bash
npm --prefix client install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Add a `test` block to `client/vite.config.js` (Vitest reads the Vite config):

```js
test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
    setupFiles: ['./src/test/setup.js'],
    css: false,
},
```

Create `client/src/test/setup.js`:

```js
import '@testing-library/jest-dom/vitest';
```

Add the same three scripts to `client/package.json`.

### 2.3 Root scripts

Add to the root `package.json`:

```json
"test:unit": "npm --prefix server run test:unit && npm --prefix client run test:unit",
"test:unit:server": "npm --prefix server run test:unit",
"test:unit:client": "npm --prefix client run test:unit",
"test:coverage": "npm --prefix server run test:coverage && npm --prefix client run test:coverage"
```

Then commit the setup and add `npm run test:unit` to the verification gate in `AGENTS.md` (it is already listed there as a required step).

---

## 3. Layout & Ownership

Tests are **colocated** with the code they cover, so ownership follows the vertical-slice rules in `AGENTS.md` §3.

```
server/src/services/auth.service.test.js
server/src/services/branches.service.test.js
server/src/validators/staff.validator.test.js
server/src/middlewares/enforceBranchScope.test.js
server/src/utils/encryption.test.js
server/src/test/…                      ← shared helpers only (mockPrisma, fakeReqRes)
client/src/utils/formatters.test.js
client/src/components/ProtectedRoute.test.jsx
client/src/test/…                      ← shared setup + render helpers
```

**You own the tests for your slice.** Do not modify another member's tests without coordinating in team chat.

| Member          | Test scope                                                                                                                                      |
| :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| **M1 — Ezzat**  | `auth`, `staff`, `branches`, `settings`, `middlewares/*`, `utils/*`, `validators/*`, client `App`, `AuthContext`, `api/client`, `pages/admin/*` |
| **M2 — George** | `instructors`, `courses`, `groups`, `sessions` + client `pages/academic/*`                                                                      |
| **M3 — Marco**  | `students`, `enrollments` + client `pages/students/*`                                                                                           |
| **M4 — Mazen**  | `attendance` + client `pages/attendance/*`                                                                                                      |
| **M5 — 3ATEF**  | `payments`, `closings`, `notifications`, `dashboard` + client `pages/finance/*`, `QuickPaymentModal`                                            |

---

## 4. What to Test per Layer

| Layer                  | Test these                                                                                                                          | Notes                                                              |
| :--------------------- | :---------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------- |
| **Validators** (`Zod`) | accept/reject, coercion (`"20" → 20`), defaults, empty-string → `undefined`                                                         | Pure functions, no mocks.                                          |
| **Utils**              | encryption round-trip + tamper detection, blind-index determinism, `parsePagination` clamps, phone validation, EGP/Cairo formatting | Pure functions.                                                    |
| **Middlewares**        | RBAC matrix (401/403), branch scope (`ADMIN → null`, manager → `branchIds`, explicit foreign `branchId` → 403), Zod error shape     | Use fake `req`/`res`/`next`; no Express server needed.             |
| **Services**           | every business rule and early return: lockout, soft-delete filters, scope where-clauses, audit calls, idempotency, voiding          | Mock `prisma` + `logAudit`; never touch PostgreSQL.                |
| **Client utils**       | formatters, role labels, money/date display                                                                                         | Pure.                                                              |
| **Client components**  | `ProtectedRoute` (loading / guest / wrong role / allowed), `LoginPage` error + submitting states, `AuthContext` login/logout        | RTL + `MemoryRouter`; assert roles/text, **not** Tailwind classes. |

### 4.1 Critical invariants — one dedicated test each

These are non-negotiable and belong to the owning slice:

1. `nationalId` / `nationalIdEncrypted` / `nationalIdImageUrl` never appear in responses for non-`ADMIN` (**M3**).
2. No code path calls `prisma.student.delete` / `prisma.payment.delete`; soft-delete sets `deletedAt`, payments set `VOIDED` (**M3/M5**).
3. Every student/payment list query filters `deletedAt: null` and applies `req.branchScope` (**M3/M5**).
4. Sensitive actions call `logAudit()` exactly once (**M1/M3/M4/M5**).
5. `enqueueNotification()` requires `idempotencyKey` and returns the existing row on `P2002` (**M5**).
6. Lateness uses `late_threshold_minutes` at the exact boundary (**M4**).
7. Money is formatted as EGP and never via float arithmetic (**M5**).
8. Login locks on the 5th failure, rejects the correct password while locked, and unlocks after expiry/reset (**M1**).

---

## 5. Conventions

- **Naming:** `<file>.test.js` / `<file>.test.jsx`, `describe('<unit>')`, test names read as behaviour: `it('rejects a foreign branch for a secretary')`.
- **AAA:** Arrange → Act → Assert. One behaviour per `it`.
- **Mocking Prisma:** mock the module, not the client instance. Use `vi.hoisted()` for the mock object so `vi.mock` factories can reference it:

    ```js
    import { describe, expect, it, vi } from 'vitest';

    const prismaMock = vi.hoisted(() => ({
        branch: { findMany: vi.fn() },
        auditLog: { create: vi.fn() },
    }));

    vi.mock('../config/prisma.js', () => ({ prisma: prismaMock }));

    import { listBranches } from './branches.service.js';
    ```

- **Time:** never depend on the host clock or host timezone. Use `vi.useFakeTimers()` + `vi.setSystemTime(...)` for lockout/expiry, and assert `Africa/Cairo` output for a fixed UTC instant.
- **No real I/O:** no PostgreSQL, no HTTP, no filesystem in unit tests. Supertest integration tests are a separate phase (§7).
- **Arabic UI:** assert accessible text, `role`, and labels (Arabic strings are fine); never assert colours or class names.
- **Coverage is a flashlight, not a target:** report it in the PR, but do not chase 100% by testing getters. Every branch in a service needs a case.

---

## 6. Running

```bash
npm run test:unit              # server + client, CI mode
npm run test:unit:server       # server only
npm run test:unit:client       # client only
npm run test:unit -- --watch   # watch mode (or: npm --prefix server run test:watch)
npm run test:coverage          # coverage report (text + lcov)
```

**Definition of Done for any slice/PR:**

- [ ] Every new/changed service, validator, middleware, util, or client hook has tests for its decision branches.
- [ ] The 8 critical invariants owned by that slice have a dedicated test.
- [ ] `npm run test:unit` passes locally.
- [ ] `npm run verify` still passes.
- [ ] No test hits the real database or network.

---

## 7. Out of Scope for Unit Tests (Phase 2 / Manual)

Unit tests do **not** replace the existing checks required by `AGENTS.md` §7.4:

- **Integration/API tests (Supertest)** against a disposable PostgreSQL database (`DATABASE_URL_TEST`): auth flow, RBAC 403s, pagination envelopes, and the QR-scan concurrency guarantee (`AC-01`, `AC-02`). Plan as a post-slice phase; seed + truncate between suites.
- **End-to-end UI** (Playwright) for the reception scan flow and prints.
- **Load/latency** for `POST /api/attendance/scan` (p95 < 1s).
- **Manual RTL/print/a11y review** per `docs/UI_DESIGN_SYSTEM.md`.

Until those exist, keep running the runtime verification described in `AGENTS.md` §7.4 for every PR.
