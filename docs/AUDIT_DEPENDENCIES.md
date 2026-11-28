# Dependency security (C3)

## Current audit (last reviewed 2026-11-27)

- server: **6 advisories** (2 moderate, 4 high). client: **0**.
- `prisma` / `@prisma/config` high (direct, **build-time**). `@prisma/config`→`deepmerge-ts` high. `@prisma/config`→`effect` high. `minimatch` moderate (**dev-only** nodemon).
- `npm audit fix --dry-run` does not resolve; only `--force` (breaking) or Prisma 7. **Not applied.**
- `npm audit fix --force` **not used**; no unverified `overrides`; **Prisma 6.19.3 preserved** (no Prisma 7).

## Production runtime vs build-time

- The 4 **high** advisories are Prisma **CLI/config** (build-time), **not** in the Express request path. `@prisma/client` runtime itself is not flagged.
- `minimatch` (nodemon) is **dev-only**. Not shipped.
- No advisory affects runtime production code paths.

## Fixes applied

None requiring a breaking change. No safe patch/minor was available that preserves Prisma 6.19.3.

## Deferred advisories + reasons

- Prisma build-time highs: require **Prisma 7** (`prisma.config.ts`, regenerate, full regression) → **separate tracked migration**, not this task.
- `minimatch` dev moderate: acceptable; consider `overrides` `minimatch@^11` if nodemon compatibility verified.
- Review recommendation: re-run `npm audit` each release. **Next planned review: 2026-12-31.**

**Not claiming zero vulnerabilities.**
