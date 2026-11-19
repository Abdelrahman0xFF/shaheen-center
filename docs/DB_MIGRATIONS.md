# Database Migrations Guide (Conflict-Free Team Workflow)

This project relies strictly on **Prisma Migrations** (`server/prisma/migrations/`) so all 5 team members stay in sync without overwriting each other's PostgreSQL schema.

---

## Golden Rules

1. **Baseline Schema First:** The unified MVP `server/prisma/schema.prisma` already includes all core tables for Members 1–5. Most MVP work **should not need new tables**.
2. **Never use `prisma db push`** on shared branches — it bypasses migration history and breaks teammates' local databases.
3. **Never edit or delete committed migration SQL files** under `server/prisma/migrations/`. Always add a new forward migration.
4. **Coordinate schema changes:** Because `schema.prisma` is shared, announce in team chat before adding a new migration and keep schema PRs small and fast to merge.

---

## Day 0 Setup (One Time by Team Lead / Member 1)

Once PostgreSQL is running and `server/.env` has `DATABASE_URL`:

```bash
cd server
npx prisma migrate dev --name init_mvp_schema
npx prisma db seed
```

Commit the generated `server/prisma/migrations/<timestamp>_init_mvp_schema/` folder to `main`.

---

## Daily Workflow for All Members

### When Pulling `main` (Getting Teammates' Migrations)

```bash
git pull origin main
cd server
npx prisma migrate deploy   # or: npx prisma migrate dev
npx prisma generate
```

### When You Need to Change `schema.prisma`

1. Pull latest `main` first (`git pull origin main`) so your migration sits on top of the latest timestamp.
2. Edit `server/prisma/schema.prisma`.
3. Validate before migrating:
    ```bash
    cd server
    npx prisma validate
    ```
4. Create a named migration prefixed with your slice:
    ```bash
    npx prisma migrate dev --name m3_add_student_notes_column
    ```
5. Commit **both** `schema.prisma` and the new folder in `server/prisma/migrations/`.
6. Open a PR quickly so teammates can pull it.

---

## Resolving a Migration Conflict (If Two Members Migrated in Parallel)

If you merged `main` and Prisma detects diverged migrations:

1. **Do NOT manually edit the teammate's migration.**
2. Delete only **your** uncommitted/unmerged local migration folder.
3. Re-run `npx prisma migrate dev --name <your_migration_name>` on top of the pulled migrations.
4. If your local dev DB is out of sync (local dev only, never prod!):
    ```bash
    npx prisma migrate reset   # drops local dev DB, replays all migrations, runs seed.js
    ```
