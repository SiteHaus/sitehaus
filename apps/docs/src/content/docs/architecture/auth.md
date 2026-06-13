---
title: Authentication Flow
description: OAuth 2.0 Authorization Code + PKCE across IAM, API, SDK, and client apps.
---

## Overview

SiteHaus uses OAuth 2.0 Authorization Code flow with PKCE. The **API** (`apps/api`) is the identity provider — it issues and validates all tokens. The **IAM app** (`apps/iam`) is the login/register/2FA/consent UI. Other apps (dashboard, commerce admin) are OAuth clients that redirect to IAM for login and receive short-lived access tokens in return. Refresh tokens live in a per-client HTTP-only cookie (`sh_refresh_<key>`) and are managed automatically by `@site-haus/sdk`.

The separate **sitehaus-commerce** gateway is *not* an SPA OAuth client — it validates IAM-issued tokens server-side via `POST /auth/introspect` (using `@sitehaus/client-sdk`), and client storefronts (`camo-web`, `nayadnara`) run the same PKCE flow via `@sitehaus/client-sdk/frontend`. See the [Identity & Auth feature inventory](/domains/identity/) and [API surface](/domains/identity/api-surface/) for the full cross-repo picture.

---

## Players

| Term              | What it is                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------ |
| **IAM app**       | `apps/iam` — the login/register UI at `iam.localhost`                                      |
| **API**           | `apps/api` — NestJS backend, issues and validates all tokens                               |
| **Client app**    | `apps/dashboard`, `apps/commerce` — apps that delegate auth to IAM                         |
| **`client_key`**  | Public identifier for a client app (e.g. `"dashboard"`) — set via `NEXT_PUBLIC_CLIENT_KEY` |
| **Access token**  | Short-lived JWT stored **in JS memory only** (Zustand auth store, no persistence). Sent as `Authorization: Bearer` header |
| **Refresh token** | Long-lived opaque token stored in a per-client `sh_refresh_<key>` HTTP-only cookie. Never touches JS |
| **Auth code**     | Single-use 90-second code exchanged for tokens at the token endpoint                       |
| **PKCE**          | Proof Key for Code Exchange — prevents auth code interception. S256 only, no plain         |
| **Session**       | Server-side record binding a user, client, device, and refresh token                       |
| **`sh_refresh_<key>`** | The refresh token cookie, named per client key (e.g. `sh_refresh_dashboard`): `HttpOnly`, `Secure` (prod or `SameSite=none`), `SameSite` (Lax in dev, None in prod). Legacy unsuffixed `sh_refresh` is still read as a fallback. |

---

## Full Login Flow

```
[CLIENT APP] dashboard.localhost/login
  │
  │  1. User clicks "Sign in with SiteHaus"
  │  2. generatePKCE() → { codeVerifier, codeChallenge }
  │  3. generateState() → random CSRF token
  │  4. Store in sessionStorage: oauth_code_verifier, oauth_state
  │  5. Redirect to:
  │
  ▼
[API] GET /auth/authorize
  ?client_key=dashboard
  &redirect_uri=https://dashboard.localhost/callback
  &response_type=code
  &code_challenge={sha256(verifier)}
  &code_challenge_method=S256
  &scope=openid profile email
  &state={csrf}
  │
  │  Validates: client exists, redirect_uri registered, scope allowed, PKCE format
  │
  ├─[has valid JWT or sh_refresh cookie + 2FA verified]──────────────────────┐
  │                                                                           │
  └─[not authenticated]                                                       │
       │                                                                      │
       │  Encode oauth_params as base64url, redirect to:                     │
       ▼                                                                      │
[IAM] /login?oauth_params={base64url}                                        │
  │                                                                           │
  │  User submits email + password                                           │
  │  POST /auth/login → { accessToken, requires2FA?, requiresEmailVerification? }
  │                                                                           │
  ├─[requires2FA: true]                                                       │
  │    → Partial token issued (TTL: 5 min, mfa: "pending")                   │
  │    → Redirect to /2fa-verify                                              │
  │    → User submits TOTP code                                               │
  │    → POST /auth/2fa/verify-login                                          │
  │    → Session stamped with mfaVerifiedAt                                  │
  │    → Full access token issued                                             │
  │                                                                           │
  ├─[requiresEmailVerification: true]                                         │
  │    → Redirect to /verify                                                  │
  │                                                                           │
  └─[authenticated]                                                           │
       │  IAM form-POSTs { accessToken, oauthParams } to [API] POST /auth/sso-link
       │  (a form POST so api.localhost is the top-level origin and the      │
       │   sh_refresh_<key> cookie lands in the first-party — unpartitioned —│
       │   jar; this defeats Firefox Total Cookie Protection).              │
       │  sso-link creates a fresh session, sets the cookie, decodes        │
       │  oauth_params, and redirects back to /authorize                     │
       └────────────────────────────────────────────────────────────────────►│
                                                                              │
[API] /authorize (now authenticated)                                          │◄─┘
  │
  ├─[client.requiresConsent AND user hasn't consented to scope]
  │    → Redirect to IAM /consent
  │    → User reviews scopes, clicks Allow
  │    → POST /auth/consent → { redirect_url }
  │    → Redirect back to client callback with code
  │
  └─[no consent needed OR already consented]
       │  Create auth code (32-byte random, hashed in DB, 90s TTL)
       │  Redirect to:
       ▼
[CLIENT APP] /callback?code={code}&state={csrf}
  │
  │  1. Validate state matches sessionStorage.oauth_state (CSRF check)
  │  2. Get code_verifier from sessionStorage
  │  3. POST /auth/token { code, code_verifier, redirect_uri, client_key }
  │
  ▼
[API] POST /auth/token
  │
  │  1. Hash code_verifier with SHA256
  │  2. Compare with stored codeChallenge (constant-time)
  │  3. Validate code not expired or consumed
  │  4. Create session record (generates refresh token, stores hash)
  │  5. Set sh_refresh cookie (HttpOnly, Secure)
  │  6. Auto-join user to client with default role (if first time)
  │  7. Issue JWT access token
  │  Returns: { access_token, token_type: "Bearer", expires_in, scope, requires_2fa? }
  │
  ▼
[CLIENT APP] /callback (token received)
  │
  │  1. useAuthStore.setAccess({ accessToken, accessExpiration })
  │     (stored in JS memory only — Zustand store has no persist layer)
  │  2. await me() → fetch user profile, session, permissions
  │  3. Clear sessionStorage (oauth_code_verifier, oauth_state)
  │  4. router.replace(nextUrl || "/")
  │
  ▼
[DASHBOARD LOADS] ✓
```

---

## Ongoing Request Lifecycle

Every API call goes through `apiFetcher` (`packages/sdk/src/fetcher.ts`):

```
1. Read token from auth store: { accessToken, accessExpiration }

2. if (accessExpiration - now <= 60s):
     → runSingleRefresh() — proactive refresh before token expires
     → Single-refresh lock prevents concurrent refresh storms

3. Attach headers to every request:
     Authorization: Bearer {accessToken}
     x-client-key: {clientKey}
     credentials: "include"   ← sends sh_refresh cookie

4. If response is 401:
     → runSingleRefresh() again
     → Retry original request with new token
```

**Token refresh** (`POST /auth/refresh`):

- Backend reads `sh_refresh` cookie, validates session
- Rotates refresh token (old one invalidated, new cookie set)
- Returns new access token
- `onAuthUpdate` callback updates auth store

---

## Token Reference

| Token                | Format         | TTL                           | Storage                                 | JWT Claims                                                                |
| -------------------- | -------------- | ----------------------------- | --------------------------------------- | ------------------------------------------------------------------------- |
| Access token         | JWT HS256      | `ACCESS_TTL_SEC`              | JS memory only (Zustand auth store)     | `sub` (userId), `sid` (sessionId), `aud` (clientId), `mfa?`, `iat`, `exp` |
| Partial access token | JWT HS256      | 5 min (hardcoded `MFA_PENDING_TTL_SEC` constant in `auth.service.ts`, **not** an env var) | JS memory only | same + `mfa: "pending"`                              |
| Refresh token        | 96-byte random | `REFRESH_TTL_SEC`             | `sh_refresh_<key>` HTTP-only cookie     | opaque — SHA256 (b64url) hash stored in DB                                |
| Auth code            | 32-byte random | 90 seconds                    | DB only (SHA256 hash)                   | single-use, bound to PKCE challenge + redirect_uri                        |

---

## API Guard Stack

Guards run in this order on every protected request:

| Guard             | File                                  | What it checks                                                                                                                                     |
| ----------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AccessGuard`     | `auth/access/access.guard.ts`         | JWT signature, session exists + not revoked, session not expired. Populates `req.user`. Routes marked `@Public()` skip.                            |
| `VerifiedGuard`   | `auth/verified/verified.guard.ts`     | `users.isVerified === true`. Skip with `@VerifiedOptional()`.                                                                                      |
| `MfaGuard`        | `auth/mfa/mfa.guard.ts`               | Blocks if `req.user.mfa === "pending"` (unless route is `@MfaPending()` or `@MfaOptional()`).                                                      |
| `PermissionGuard` | `auth/permission/permission.guard.ts` | Checks `@RequirePerms(...perms)` (all required) or `@RequireAnyPerm(...perms)` (one required). Queries user's role permissions for current client. |

`req.user` shape after `AccessGuard`:

```typescript
{
  userId: string;
  clientId: string;
  sessionId: string;
  firstName?: string;   // present in the type; not populated by AccessGuard today
  lastName?: string;    // present in the type; not populated by AccessGuard today
  mfa?: "pending" | "complete";  // in practice only "pending" or absent — "complete" is never set
}
```

`clientId` here is the token's `aud`. Permission checks instead use `req.client?.id`
(the `x-client-id` header) when present, falling back to the session's `aud` — this lets
first-party apps act on behalf of a different (merchant) client.

---

## Session Model

Sessions are stored in `sessionsTable`. Key fields:

```
id            UUID
userId        → users
clientId      → clients
deviceId      → devices (resolved from IP + UA hash)
refreshHash   SHA256 of refresh token (never stored plain)
ipHash        SHA256 of client IP
uaHash        SHA256 of user-agent
expiresAt     Refresh token expiry
revokedAt     NULL = active, timestamp = revoked
mfaVerifiedAt NULL = 2FA not done on this session, timestamp = done
lastUsedAt    Updated (rate-limited) on each request via AccessGuard
```

**Refresh token reuse detection**: If a refresh token is submitted but its session is already revoked (`revokedAt IS NOT NULL`), the API immediately revokes **all sessions** for that user+client. This detects a stolen/leaked refresh token.

---

## 2FA Flow Detail

```
Login with 2FA enabled:
  POST /auth/login
  → TotpService.isEnabled(userId) = true
  → Issue partial token (TTL: 5 min, mfa: "pending")
  → Response: { accessToken, requires2FA: true }

Client receives requires2FA: true:
  → Store partial token in auth store
  → Redirect to /2fa-verify

User submits TOTP code:
  POST /auth/2fa/verify-login { code }
  (requires MfaPending guard — only partial tokens allowed here)
  → TotpService.verify(userId, code)
  → SessionService.markMfaVerified(sessionId)
  → Issue full token (no mfa claim)

Backup codes:
  → 10 one-time-use codes generated at 2FA setup
  → SHA256 hashed in DB, removed after use
  → verify() tries TOTP first, then backup codes

TOTP replay protection:
  → lastUsedCounter tracked per user
  → Rejects any code with counter ≤ lastUsedCounter
```

---

## Key Security Properties

- **PKCE S256 only** — `code_challenge_method` must be `"S256"`. Plain rejected.
- **State param CSRF** — State generated per login, stored in `sessionStorage`, validated at callback.
- **HTTP-only refresh cookie** — `sh_refresh_<key>` is never accessible to JS. XSS cannot steal it.
- **In-memory access tokens** — Access tokens live only in the Zustand auth store (no `localStorage`/`sessionStorage` persistence), so they are cleared on full page reload/tab close. (`sessionStorage` *is* used, but only for the transient `oauth_state` and `oauth_code_verifier`/`pkce_verifier` PKCE values during the redirect, never for the access token.)
- **Refresh token rotation** — Every refresh issues a new token and invalidates the old one.
- **Reuse detection** — Submitting a revoked refresh token triggers full session wipe for that user+client.
- **Single refresh lock** — `runSingleRefresh` prevents concurrent refresh storms on parallel requests.
- **Proactive refresh** — Token refreshed 60s before expiry (configurable via `proactiveRefreshSkewSec`).
- **Constant-time comparison** — All sensitive comparisons use `CryptoService.safeEqual()`.
- **TOTP replay protection** — Counter-based, rejects reuse within same 30s window.
- **Session binding** — Access token `sid` claim must match a non-revoked session in DB.

---

## Environment Variables

| Variable                            | Required | Description                                                                    |
| ----------------------------------- | -------- | ------------------------------------------------------------------------------ |
| `JWT_SECRET` or `JWT_SECRET_B64URL` | Yes      | HMAC signing secret for JWTs                                                   |
| `JWT_ALG`                           | No       | Algorithm (default: `HS256`)                                                   |
| `ACCESS_TTL_SEC`                    | Yes      | Access token lifetime in seconds (e.g. `900` = 15 min)                         |
| `REFRESH_TTL_SEC`                   | Yes      | Refresh token lifetime in seconds (e.g. `604800` = 7 days)                     |
| `COOKIE_SAME_SITE`                  | No       | Override SameSite: `strict`, `lax`, `none`. Auto: `lax` in dev, `none` in prod |
| `COOKIE_DOMAIN`                     | No       | Restrict cookie to a domain (e.g. `.sitehaus.dev`)                             |
| `JWT_SECRET_B64URL` / `JWT_SECRET`  | Yes      | One or the other; `JWT_SECRET_B64URL` decoded as base64url, else `JWT_SECRET` as UTF-8 |

The partial (MFA-pending) token TTL is **not** configurable — it is the hardcoded
`MFA_PENDING_TTL_SEC = 5 * 60` constant in `apps/api/src/auth/auth.service.ts`. The
JWT algorithm is pinned to `JWT_ALG` (default `HS256`) on both signing and verification
via `JwtModule` (`signOptions` + `verifyOptions`).

---

## Key Source Files

| Area                          | File                                                                    |
| ----------------------------- | ----------------------------------------------------------------------- |
| Authorize + token + sso-link  | `apps/api/src/auth/oauth/oauth.controller.ts`                           |
| Auth code create/consume (PKCE) | `apps/api/src/auth/auth-code/auth-code.service.ts`                    |
| Session CRUD + rotation       | `apps/api/src/session/session.service.ts`                              |
| Token introspection           | `apps/api/src/auth/auth.service.ts` (`introspect`)                      |
| JWT issuance                  | `apps/api/src/auth/token/token.service.ts`                              |
| Cookie config                 | `apps/api/src/auth/cookie/cookies.ts`                                   |
| 2FA / TOTP                    | `apps/api/src/auth/totp/totp.service.ts`                                |
| Primary auth guard            | `apps/api/src/auth/access/access.guard.ts`                              |
| IAM login container           | `apps/iam/app/(auth)/login/login-container.tsx`                         |
| IAM 2FA verify                | `apps/iam/app/(auth)/2fa-verify/two-factor-verify-container.tsx`        |
| Client callback               | `apps/dashboard/app/callback/page.tsx`                                  |
| PKCE helpers + code exchange  | `packages/sdk/src/oauth.ts`                                             |
| Token attachment + 401 retry  | `packages/sdk/src/fetcher.ts`, `packages/sdk/src/http.ts`               |
| Refresh + single-refresh lock | `packages/sdk/src/refresh.ts`, `packages/sdk/src/run-single-refresh.ts` |
| Client-side auth state        | `packages/stores/src/auth-store.ts`                                     |
