# Authentication (Member 1)

## Endpoints

| Method | Path                   | Auth   | Rate limit      | Notes                                                                                   |
| ------ | ---------------------- | ------ | --------------- | --------------------------------------------------------------------------------------- |
| POST   | `/api/auth/login`      | public | login limiter   | returns `{ accessToken, user }`; sets HttpOnly refresh cookie; no refresh token in JSON |
| POST   | `/api/auth/refresh`    | cookie | refresh limiter | origin required; rotates; `REFRESH_RACE` retryable; clears cookie on terminal error     |
| POST   | `/api/auth/logout`     | cookie | —               | origin required; revokes session family; clears cookie; works without valid Bearer      |
| POST   | `/api/auth/logout-all` | Bearer | —               | revokes all sessions for the user                                                       |
| GET    | `/api/auth/me`         | Bearer | —               | safe user only                                                                          |

## Cookie (refresh token)

HttpOnly, SameSite=Lax, Secure in production, Path=`/api/auth`, no Domain, Max-Age=refresh TTL. Only a SHA-256 hash is stored. Opaque random 48-byte base64url token.

## Refresh lifecycle

Rotation with replay detection + **10s race grace**. Revoked token with active replacement within grace → `401 REFRESH_RACE` (retryable, cookie not cleared). Revoked without active replacement → revoke family + `REFRESH_TOKEN_REPLAY_DETECTED`. Absolute family lifetime `REFRESH_SESSION_MAX_DAYS` (default 30). Inactive user → revoke family. `JWT_REFRESH_SECRET` is deprecated/unused.

## Lockout

`AUTH_MAX_FAILED_ATTEMPTS` (default 5), `AUTH_LOCKOUT_MINUTES` (default 15). Expired lock is atomically reset before re-check. `423 ACCOUNT_LOCKED` only when the supplied password is correct; otherwise generic `401 INVALID_CREDENTIALS`. `ACCOUNT_LOCKED` audited once per lock.

## Access tokens

Short-lived HS256 (`JWT_EXPIRES_IN`, default 15m, max 1h), pinned issuer/audience. In-memory only on client; never localStorage; never in JSON logs. Claims: `sub`, `role`, `jti`, `tokenVersion`. No passwords, national IDs, or refresh tokens.

**`tokenVersion` revocation.** Every issuance path (`login`, `refresh`, re-issue) signs the `tokenVersion` read from the database. `authenticate` compares the claim with the current `User.tokenVersion`; a missing/malformed claim or a mismatch is rejected `401 TOKEN_REVOKED`/`401 INVALID_TOKEN`. A sensitive staff change (role change, branch reassignment, password reset, deactivation) increments `tokenVersion` in the same transaction and revokes all refresh tokens, so previously-issued access tokens stop working immediately. A fresh login afterwards works. **Reactivation does not restore previously-issued tokens.** Logout/logout-all revoke refresh tokens only; a logged-out access token remains valid until its short expiry (it cannot be used to obtain a new session).

## Error codes

`UNAUTHORIZED`, `INVALID_TOKEN`, `TOKEN_EXPIRED`, `TOKEN_REVOKED`, `ACCOUNT_INACTIVE`, `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `FORBIDDEN`, `BRANCH_FORBIDDEN`, `REFRESH_RACE`, `INVALID_REFRESH_TOKEN`, `UNTRUSTED_ORIGIN`, `ORIGIN_REQUIRED`, `VALIDATION_ERROR`, `DUPLICATE_ENTRY`, `RECORD_NOT_FOUND`, `SERVICE_UNAVAILABLE`, `INTERNAL_SERVER_ERROR`. Request id in `X-Request-Id`.

## Environment

`JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_ISSUER`, `JWT_AUDIENCE`, `REFRESH_*`, `REFRESH_SESSION_MAX_DAYS`, `AUTH_*`, `TRUSTED_ORIGINS`, `CLIENT_URL`, `ENCRYPTION_KEY`, `BLIND_INDEX_SECRET`. Strict `validateEnv()`; names only in errors.
