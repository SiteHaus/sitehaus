---
title: Findings Register
description: Issues discovered during ecosystem discovery. Logged, never fixed here.
---

Issues found during the discovery sweeps. IDs are stable — later workstreams
(security audit, dedup audit, refactor plan) reference them directly.

**Categories:** `duplication` | `standards` | `auth` | `dead-code` | `other`
**Severity:** `high` | `medium` | `low`

## Register

| ID    | Category | Severity | Repos | Files | Note |
| ----- | -------- | -------- | ----- | ----- | ---- |
| F-001 | duplication | medium | camo-web, nayadnara | `camo-web:src/app/login/page.tsx`, `camo-web:src/app/callback/page.tsx`, `camo-web:src/components/ui/require-auth.tsx`, `nayadnara:src/app/login/page.tsx`, `nayadnara:src/app/callback/page.tsx`, `nayadnara:src/components/require-auth.tsx` | Client-site auth (login PKCE init, callback code-exchange, RequireAuth guard) is duplicated near-verbatim across camo-web and nayadnara. Both wrap the same `@sitehaus/client-sdk/frontend`. Candidate for a shared client-site auth component/package. |
| F-002 | standards | low | sitehaus | `sitehaus:apps/api/CLAUDE.md`, `sitehaus:apps/api/src/auth/auth.controller.ts`, `sitehaus:apps/api/src/auth/oauth/oauth.controller.ts` | `apps/api/CLAUDE.md` states "Controllers bind to ts-rest contracts" via `@TsRestHandler`, but **no** auth-domain controller uses ts-rest — all are plain NestJS controllers that manually `schema.parse(body)`. The contracts are only used to type the SDK clients; the API does not enforce them server-side. Doc/standard vs reality drift. |
| F-003 | standards | medium | sitehaus | `sitehaus:packages/contracts/src/auth.contract.ts:190`, `sitehaus:apps/api/src/auth/oauth/oauth.controller.ts:161` | Contract drift on the OAuth endpoints. `oauthRouter.authorize`/`token` declare a **required `client_id` (uuid)** and `token` as `application/x-www-form-urlencoded`; the controller accepts **either `client_key` or `client_id`** (real clients send `client_key`) and parses JSON or form bodies. The typed contract does not match the implemented surface. |
| F-004 | standards | low | sitehaus | `sitehaus:apps/docs/src/content/docs/architecture/auth.md` (pre-fix) | The architecture doc claimed access tokens are stored "JS memory + sessionStorage" and listed `MFA_PENDING_TTL_SEC` / `sh_refresh` as configurable; actually tokens are in-memory only (Zustand, no persist), the MFA-pending TTL is a hardcoded constant in `auth.service.ts`, and the refresh cookie is per-client `sh_refresh_<key>`. Doc corrected in this sweep; logged for traceability. |
| F-005 | auth | low | sitehaus, camo-web, nayadnara | `sitehaus:packages/stores/src/auth-store.ts:148`, `sitehaus:apps/dashboard/app/callback/page.tsx:58`, `camo-web:src/app/callback/page.tsx:57`, `nayadnara:src/app/callback/page.tsx:60` | `accessExpiration` unit is inconsistent across stores. The sitehaus `auth-store` and dashboard callback compute it in **seconds** (`Math.floor(Date.now()/1000) + expires_in`); the `@sitehaus/client-sdk/frontend` callbacks (camo-web, nayadnara) compute it in **milliseconds** (`Date.now() + expires_in*1000`). Two different stores, but the divergent convention is a footgun if code is ever shared; worth confirming the client-sdk fetcher compares against the same unit it writes. |
| F-006 | dead-code | low | sitehaus | `sitehaus:apps/api/src/auth/access/access.guard.ts:22`, `sitehaus:apps/api/src/auth/access/access.guard.ts:31` | `AccessPayload.mfa`/`UserContext.mfa` are typed `'pending' \| 'complete'`, but `'complete'` is never assigned anywhere — full tokens simply omit the `mfa` claim. The `'complete'` variant is dead. Minor; flagged so security/refactor work isn't misled by the type. |
| F-007 | other | low | sitehaus, sitehaus-commerce | `sitehaus:apps/docs/src/content/docs/troubleshooting/oauth-login-issues.md:60` | Verified the troubleshooting doc's "Session Service" path `apps/api/src/session/session.service.ts` is **correct** (matches current code). No stale-path issue there. The architecture doc's stale `apps/api/src/auth/session/session.service.ts` was the wrong one and is fixed in this sweep. Logged to close out the path-audit ask. |
