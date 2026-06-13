---
title: Identity & Auth — Feature Inventory
description: OAuth2 PKCE identity provider in apps/api, consumed by IAM, dashboard, commerce admin, the commerce gateway, and client storefronts.
---

## Overview

Identity & Auth is implemented almost entirely inside the **`sitehaus` monorepo**. The
**NestJS API** (`apps/api`, port 3003) is the single identity provider: it issues and
validates all tokens, owns sessions/devices/roles/invites, and exposes an OAuth2
Authorization-Code-with-PKCE flow plus a token-introspection endpoint. The **IAM app**
(`apps/iam`, port 3002) is the login/register/2FA/consent UI and the authenticated
management console. First-party clients (`apps/dashboard`, `apps/commerce`) authenticate
through IAM using `@site-haus/sdk` + `@site-haus/stores`. The separate **sitehaus-commerce**
gateway validates IAM-issued tokens by calling `POST /auth/introspect` through the
published `@sitehaus/client-sdk` package. Client storefronts (`camo-web`, `nayadnara`) run
the same OAuth flow via `@sitehaus/client-sdk/frontend`; `onehealthclinics` has no IAM auth
at all.

The end-to-end flow (PKCE, token TTLs, guards, cookies, refresh rotation, reuse detection)
is documented in [the auth architecture page](/architecture/auth/).

## Features

| Feature | Where (repo + path) | Status | Key files |
| ------- | ------------------- | ------ | --------- |
| Password login | sitehaus `apps/api/src/auth/auth.controller.ts` (`POST /auth/login`) | live | `auth.controller.ts`, `auth.service.ts` (`login`) |
| Registration | sitehaus `apps/api/src/auth/auth.controller.ts` (`POST /auth/register`) | live | `auth.service.ts` (`register`), `crypto.service.ts` |
| Email verification | sitehaus `apps/api/src/auth/auth.controller.ts` (`request-email-verification`, `verify-email`) | live | `otp/otp.service.ts`, IAM `app/(auth)/verify/` |
| 2FA / TOTP setup | sitehaus `apps/api/src/auth/account/account.controller.ts` (`2fa/setup`, `2fa/enable`, `2fa/disable`, `2fa/status`) | live | `totp/totp.service.ts` (uses `otpauth` + `qrcode`) |
| 2FA verify at login | sitehaus `apps/api/src/auth/auth.controller.ts` (`POST /auth/2fa/verify-login`) | live | `auth.service.ts` (`completeMfaLogin`), `mfa/mfa.guard.ts` |
| Backup codes | sitehaus `apps/api/src/auth/totp/totp.service.ts` | live | 10 codes generated at `enable()`, SHA256-hashed, removed on use in `verify()` |
| Sessions | sitehaus `apps/api/src/session/session.controller.ts` + `session.service.ts` | live | `session.service.ts` (create/rotate/revoke/touch), contract `session.contract.ts` |
| Devices | sitehaus `apps/api/src/devices/devices.controller.ts` | live | `devices.service.ts`, contract `device.contract.ts` |
| Roles & permissions | sitehaus `apps/api/src/roles/roles.controller.ts` + `auth/permission/permission.guard.ts` | live | `roles.service.ts`, `@RequirePerms`/`@RequireAnyPerm` decorators |
| Invites | sitehaus `apps/api/src/invites/invites.controller.ts` | live | `invites.service.ts`, contract `invite.contract.ts` |
| OAuth clients | sitehaus `apps/api/src/clients/clients.controller.ts` + `auth/oauth/oauth.service.ts` | live | redirect-URI registration, allowed scopes, `requiresConsent`, `firstParty` flags |
| Consent screen | sitehaus `apps/api/src/auth/oauth/oauth.controller.ts` (`POST /auth/consent`) + IAM `app/(auth)/consent/` | live | only enforced when `client.requiresConsent` is set |
| Token introspection | sitehaus `apps/api/src/auth/auth.controller.ts` (`POST /auth/introspect`) | live | `auth.service.ts` (`introspect`) — consumed by commerce gateway |
| SSO link (cross-app) | sitehaus `apps/api/src/auth/oauth/oauth.controller.ts` (`POST /auth/sso-link`) | live | undocumented in the original flow doc; works around Firefox Total Cookie Protection |
| Audit logs | sitehaus `apps/api/src/audit/audit.controller.ts` (`GET /audit`) + `audit.service.ts` | live | auth events logged: login, logout, register, password change/reset, 2FA enable/disable, session revoke |
| Password change | sitehaus `apps/api/src/auth/password/password.controller.ts` (`POST /password/change`) | live | revokes all other sessions on change |
| Password reset | sitehaus `apps/api/src/auth/password/password.controller.ts` (`request-password-reset`, `reset`) + `auth/login-with-reset-code` | live | OTP `password_reset`; `reset` revokes **all** sessions for the user |
| Account email change | sitehaus `apps/api/src/auth/account/account.controller.ts` (`email/request`, `email/confirm`) | live | OTP `email_change`, password-gated |
| Account deletion | sitehaus `apps/api/src/auth/account/account.controller.ts` (`DELETE /auth/account`) | live | password-gated, clears all `sh_refresh*` cookies |

## Integration points

- **dashboard → api** — `apps/dashboard/app/callback/page.tsx` calls `exchangeCodeForTokens()` (`@site-haus/sdk`) against `POST /auth/token`; login UI lives in IAM. Bootstrap/refresh via `@site-haus/stores` `auth-store.ts` → `POST /auth/refresh`.
- **commerce admin → api** — same OAuth flow via `apps/commerce/app/callback/page.tsx` + `@site-haus/sdk`; `client_key` from `NEXT_PUBLIC_CLIENT_KEY`.
- **IAM → api** — `apps/iam/app/(auth)/login/login-container.tsx` posts to `POST /auth/login`, then form-POSTs to `POST /auth/sso-link` to seed the `sh_refresh_<key>` cookie in the first-party `api.localhost` jar before bouncing to `GET /auth/authorize`.
- **commerce gateway → IAM** — `sitehaus-commerce/apps/gateway` imports `SiteHausAuthModule` from `@sitehaus/client-sdk/nestjs`; its `IntrospectionService` calls `POST {IAM_URL}/auth/introspect` (with `x-client-key`) on every protected request, caching results for ~5s. It does **not** verify the JWT locally.
- **camo-web → api** — `camo-web/src/app/login/page.tsx` + `callback/page.tsx` run PKCE via `@sitehaus/client-sdk/frontend`; route protection through `src/components/ui/require-auth.tsx`.
- **nayadnara → api** — identical pattern to camo-web (`src/app/login`, `src/app/callback`, `src/components/require-auth.tsx`), both on `@sitehaus/client-sdk/frontend`.
- **onehealthclinics** — no IAM auth. `middleware.ts` only does a `www.` → apex 301 redirect; the storefront calls the commerce API anonymously via `lib/ecom/client.ts` and has no `@sitehaus/client-sdk` dependency.

## Notes for deep-dives

- **Token-validation split**: first-party SPAs verify nothing themselves (the API does), but the commerce gateway uses **remote introspection** (`/auth/introspect`) rather than local JWT verification. Deserves a tier-3 page on why (cross-service permission lookup, revocation visibility) and the 5s cache trade-off.
- **SSO-link cookie dance**: the `POST /auth/sso-link` form-POST exists specifically to defeat Firefox Total Cookie Protection partitioning. Worth its own page; not covered in the original flow diagram.
- **Per-client refresh cookies**: cookies are named `sh_refresh_<clientKey>` (legacy `sh_refresh` still read as fallback). `findAnyRefreshCookie` prefers per-client cookies. Subtle enough to warrant a focused page.
- **Refresh-token reuse detection** and **TOTP replay protection (counter-based)** — security-relevant mechanics, fully documented in [the auth architecture page](/architecture/auth/).
- See [the auth architecture page](/architecture/auth/) for the complete verified flow, token reference, guard stack, and session model.
