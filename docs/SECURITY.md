# Security notes

## CSRF / origin

Unsafe methods require trusted `Origin`/`Referer`; `Sec-Fetch-Site: cross-site` rejected; `Origin: null` rejected; missing origin with refresh cookie on cookie-auth routes → `ORIGIN_REQUIRED`; CLI/login without origin allowed. CORS exact allowlist + credentials, no wildcard. No double-submit CSRF token in MVP. See `verifyTrustedOrigin`.

## Cookie-auth

Refresh cookie HttpOnly + SameSite=Lax + Secure(prod) + Path=/api/auth. `verifyTrustedOriginForCookie` on refresh/logout.

## Error & log sanitization

`requestId`, `redactSensitive`, structured safe logs only; no bodies/query/headers/cookies/tokens/secrets; Prisma code mapping; generic 500 in production. `notFound` truncates path, no query echo.

## Env validation

`validateEnv()` aggregated, names-only, production strict, dev warns. See `docs/AUTHENTICATION.md`.

## Dependency advisory policy

`npm audit`; no `npm audit fix --force`; safe patch/minor + `overrides`; document exceptions with review dates; Prisma 7 as separate migration. Client currently clean.
