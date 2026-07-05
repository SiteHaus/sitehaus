---
title: Identity & Auth — API Surface
description: Auth, session, device, role, password, invite, client, and OAuth endpoints with the guards applied to each.
---

Sourced from `packages/contracts/src/*.contract.ts` and the controller decorators in
`apps/api/src/`. Guard column reflects the **actual controller decorators** — where this
differs from the ts-rest contract or the architecture doc, it is noted.

> Implementation note: despite `apps/api/CLAUDE.md` stating "controllers bind to ts-rest
> contracts," **no auth-domain controller uses `@TsRestHandler`**. They are plain NestJS
> controllers that manually `schema.parse(body)`. The contracts in `@site-haus/contracts`
> are still the source of truth for the typed SDK clients, but the API does not enforce
> them server-side. Logged as F-002.

## Guard legend

- **Public** — `@Public()`; `AccessGuard` still populates `req.user` opportunistically if a token is present.
- **Access** — global `AccessGuard` (valid JWT + live session) applies to any route not marked `@Public()`.
- **Verified** — `VerifiedGuard` (email-verified) applies globally unless `@VerifiedOptional()` or `@Public()`.
- **MFA** — `MfaGuard` blocks `mfa: "pending"` tokens unless `@MfaOptional()`; `@MfaPending()` requires a pending token.
- **Perm: x** — `@RequirePerms('x')` (all) / `@RequireAnyPerm('x')` (any).

## auth (`apps/api/src/auth/auth.controller.ts`)

| Method + path | Purpose | Guards |
| ------------- | ------- | ------ |
| `POST /auth/register` | Create account, set refresh cookie, send email-verify OTP | Public |
| `POST /auth/login` | Email/password login; may return `requires2FA` / `requiresEmailVerification` | Public, throttled (5/window) |
| `POST /auth/refresh` | Exchange `sh_refresh*` cookie for a new access token; rotates refresh | Public |
| `POST /auth/2fa/verify-login` | Verify TOTP during login, upgrade partial → full token | `@MfaPending()` (partial token only), throttled |
| `POST /auth/logout` | Revoke current session, clear refresh cookie | `@VerifiedOptional()` `@MfaOptional()` |
| `GET /auth/me` | Current user, session, permissions | `@VerifiedOptional()` `@MfaOptional()` |
| `POST /auth/request-email-verification` | Resend email-verify OTP (silent if verified) | Public, throttled |
| `POST /auth/verify-email` | Consume email-verify OTP, mark user verified | Public, throttled |
| `POST /auth/login-with-reset-code` | Login via password-reset OTP | Public, throttled |
| `POST /auth/introspect` | Validate a bearer token; returns user + session + permissions | Public, throttled (120/window) |

## oauth (`apps/api/src/auth/oauth/oauth.controller.ts`)

| Method + path | Purpose | Guards |
| ------------- | ------- | ------ |
| `GET /auth/authorize` | OAuth2 authorize; redirects to IAM login/consent or back with `code` | Public |
| `POST /auth/token` | PKCE code exchange → access token (+ sets refresh cookie) | Public |
| `POST /auth/consent` | Record consent, issue auth code | `@VerifiedOptional()` (requires `req.user`) |
| `POST /auth/sso-link` | Form-POST SSO bridge: seeds first-party refresh cookie, redirects to `/auth/authorize` | Public |

> Contract drift: `oauth.contract.ts` declares `authorize`/`token` with a **required `client_id` (uuid)** and `token` as `application/x-www-form-urlencoded`. The controller actually accepts **either `client_key` or `client_id`** (`client_key` is what every real client sends) and parses a JSON or form body. Logged as F-003.

## account (`apps/api/src/auth/account/account.controller.ts`)

| Method + path | Purpose | Guards |
| ------------- | ------- | ------ |
| `PATCH /auth/profile` | Update first/last name | Access + Verified |
| `POST /auth/email/request` | Request email change (password-gated, sends OTP) | Access + Verified, throttled |
| `POST /auth/email/confirm` | Confirm email change with OTP | Access + Verified, throttled |
| `DELETE /auth/account` | Delete account (password-gated), clear all refresh cookies | Access + Verified |
| `GET /auth/2fa/status` | 2FA enabled status | Access + Verified |
| `POST /auth/2fa/setup` | Generate TOTP secret + QR (not yet persisted) | Access + Verified |
| `POST /auth/2fa/enable` | Verify code, persist credential, return backup codes | Access + Verified, throttled |
| `POST /auth/2fa/disable` | Disable 2FA (password-gated) | Access + Verified |

## password (`apps/api/src/auth/password/password.controller.ts`, base path `/password`)

| Method + path | Purpose | Guards |
| ------------- | ------- | ------ |
| `POST /password/change` | Change password; revokes all other sessions | Access (`@VerifiedOptional()` on class), throttled |
| `POST /password/request-password-reset` | Send password-reset OTP (silent if no user) | Public, throttled |
| `POST /password/reset` | Reset password via OTP; revokes **all** sessions | Public, throttled |

## sessions (`apps/api/src/session/session.controller.ts`, base path `/session`)

| Method + path | Purpose | Guards |
| ------------- | ------- | ------ |
| `GET /session` | List active sessions for user+client | `@VerifiedOptional()` + Perm: `sessions:read` |
| `POST /session/revoke-others` | Revoke all other sessions | Perm: `sessions:revoke` |
| `POST /session/:sessionId/revoke` | Revoke one session | Perm: `sessions:revoke` |

## devices (`apps/api/src/devices/devices.controller.ts`)

| Method + path | Purpose | Guards |
| ------------- | ------- | ------ |
| `GET /devices` | List known devices | Perm: `devices:read` |
| `POST /devices/:deviceId/rename` | Rename a device | Perm: `devices:rename` |
| `POST /devices/:deviceId/revoke` | Revoke device sessions | Perm: `devices:revoke` |

## roles (`apps/api/src/roles/roles.controller.ts`)

| Method + path | Purpose | Guards |
| ------------- | ------- | ------ |
| `GET /roles` | List roles for client | Perm: `roles:read` |
| `POST /roles` | Create role | Perm: `roles:manage` |
| `PATCH /roles/:roleId` | Update role | Perm: `roles:manage` |
| `DELETE /roles/:roleId` | Delete role | Perm: `roles:manage` |
| `GET /roles/:roleId/perms` | Get role permissions | Perm: `roles:read` |
| `POST /roles/:roleId/perms/replace` | Replace role permissions | Perm: `roles:manage` |
| `GET /roles/users/:userId/roles` | List a user's roles | Perm: `roles:read` |
| `POST /roles/users/:userId/roles/:roleId` | Assign role to user | Perm: `roles:assign` |
| `DELETE /roles/users/:userId/roles/:roleId` | Unassign role | Perm: `roles:assign` |

## invites (`apps/api/src/invites/invites.controller.ts`)

| Method + path | Purpose | Guards |
| ------------- | ------- | ------ |
| `GET /invites` | List invites for client | Perm: `invites:read` |
| `POST /invites` | Create invite | Perm: `invites:manage` |
| `GET /invites/check` | Validate an invite code (pre-accept) | Public |
| `POST /invites/accept` | Accept invite, join client | Public |
| `POST /invites/:id/cancel` | Cancel invite | Perm: `invites:manage` |
| `POST /invites/:id/resend` | Resend invite email | Perm: `invites:manage` |

## clients (`apps/api/src/clients/clients.controller.ts`)

| Method + path | Purpose | Guards |
| ------------- | ------- | ------ |
| `POST /clients` | Create OAuth client | Perm: `clients:manage` |
| `GET /clients/me/members` | List members of current client | Perm: `members:read` |
| `GET /clients/first-party` | List first-party staff | Perm: `members:read` |
| `GET /clients/me/clients` | Clients the user belongs to | Access (no perm) |
| `GET /clients/current` | Current client detail (`x-client-id`) | Perm: `clients:read` |
| `PATCH /clients/current` | Update current client | Perm: `clients:manage` |
| `GET /clients/current/redirect-uris` | List redirect URIs | Perm: `clients:read` |
| `POST /clients/current/redirect-uris` | Add redirect URI | Perm: `clients:manage` |
| `DELETE /clients/current/redirect-uris/:uriId` | Remove redirect URI | Perm: `clients:manage` |

## audit (`apps/api/src/audit/audit.controller.ts`)

| Method + path | Purpose | Guards |
| ------------- | ------- | ------ |
| `GET /audit` | Read audit log | Perm: `audit:read` |
