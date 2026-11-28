# Backup & Restore (CLI-only MVP)

## Prerequisites

PostgreSQL `pg_dump`/`pg_restore`. `PG_BIN` default `C:\Program Files\PostgreSQL\19\bin`. `DATABASE_URL`. `BACKUP_DIR` (default `server/backups`, gitignored). `BACKUP_RETENTION_DAYS` (default 14).

## Backup

`npm run db:backup` → `pg_dump --format=custom --no-owner --no-privileges`, SHA-256 `.sha256`, retention after success, safe metadata only. No API endpoint. Never commit dumps. Backups contain PII; encrypt at rest; optional `gpg` AES-256 via `BACKUP_ENCRYPTION_PASSPHRASE`. Offsite to approved storage. Access admin/ops only.

## Verify

`npm run db:verify-backup <file.dump>` → PGDMP magic, checksum, `pg_restore --list`.

## Restore (safety guards)

`node scripts/restore-db.js --file <dump> --target-database-url <url> --confirm [--clean]`
Refuses unless: `--confirm`; target != `DATABASE_URL`; target name `_test`/`_restore_test`; host local/allowlisted; PGDMP; checksum match; `pg_restore --list` ok. **Never restore over production.**

## Restore drill

createdb `shaheen_center_restore_test`; restore; verify row counts (User, Branch, Room, Student, Payment, AuditLog); start server on port 5001; `/api/ready`; login disposable test account; one read-only protected request; drop DB.

## RPO/RTO

Daily; RPO 24h, RTO 1h (proposal).
