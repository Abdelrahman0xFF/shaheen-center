# Shaheen Center Management System (سنتر شاهين) — MVP Base

Arabic-RTL, mobile-first web application for managing multi-branch tutoring centers, built according to `SRS v1.0 - Shaheen Center Management System`.

## Tech Stack (MVP)

- **Frontend (`client/`):** React 19 + Vite + Tailwind CSS v4 + React Router + Axios + Lucide Icons (Arabic RTL + PWA foundation)
- **Backend (`server/`):** Node.js (ESM) + Express 4 + Zod + JWT + bcryptjs + AES-256-GCM Encryption
- **Database:** PostgreSQL + Prisma ORM (migration-first workflow)

> **MVP Scope Note:** BullMQ/Redis workers, scheduled crons, and Docker/VPS deployment are intentionally deferred to Post-MVP. Outgoing notifications are persisted to the `Notification` table via `notification.service.js` so swapping in BullMQ + Zagel later requires changing a single service file.

---

## Quick Start

### 1. Prerequisites

- Node.js `>= 20`
- PostgreSQL `>= 15` running locally

### 2. Install Dependencies

```bash
npm run install:all
```

### 3. Configure Environment Variables

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env` and set your `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY` (64 hex chars = 32 bytes), and `BLIND_INDEX_SECRET`.

### 4. Run Initial Prisma Migration & Seed

```bash
npm run db:migrate
npm run db:seed
```

### 5. Run Development Servers

Open two terminals:

```bash
npm run dev:server   # Express API on http://localhost:5000
npm run dev:client   # Vite React UI on http://localhost:5173
```

---

## Key Docs & Task Trackers

- [AGENTS.md](./AGENTS.md) — Engineering rules, vertical slice boundaries, security invariants, and coding conventions
- [docs/UI_DESIGN_SYSTEM.md](./docs/UI_DESIGN_SYSTEM.md) — Colors, Arabic fonts, RTL rules, accessibility, and thermal/A4 print specs
- [docs/DB_MIGRATIONS.md](./docs/DB_MIGRATIONS.md) — Team Prisma migration workflow to avoid database conflicts
- [docs/TESTING.md](./docs/TESTING.md) — Unit-testing strategy (Vitest), ownership per slice, and critical-invariant checklist
- [tasks/README.md](./tasks/README.md) — Team task tracker & links to each member's checklist
