# Auth Security Audit — Design Spec

**Workstream 2 of 5** in the SiteHaus ecosystem cleanup effort.
**Date:** 2026-06-13
**Status:** Approved (design); pending implementation plan.
**Predecessor:** Workstream 1 (Discovery + docs) — produced `apps/docs` and the
`F-###` findings register (F-001…F-029). This audit is seeded by the `auth`
findings F-003, F-005, F-006, F-011 (and references F-023).

> **Sensitivity note:** This spec is the audit *plan* — methodology, scope, and a
> generic threat model. It contains **no** exploit detail and is safe to commit.
> The audit's *output* (exploit-detailed findings) is local-only and gitignored —
> see [Deliverables](#deliverables--location).

---

## 1. Goal

A threat-driven security audit of the **entire authentication path** across the
SiteHaus ecosystem, producing a prioritized, actionable remediation runway —
**without changing any production code**. Issues are found, documented, and
sequenced for fixing; fixing is a separate, later-approved workstream.

## 2. Scope

**In scope — the full auth path end-to-end:**

- IAM core (`sitehaus/apps/api`): OAuth2 authorize/token/refresh, JWT
  issuance/verification, sessions, 2FA/TOTP, password/OTP, guards.
- The IAM→commerce trust boundary: `sitehaus-commerce` gateway introspection via
  `@sitehaus/client-sdk`, store-resolution/tenant-isolation.
- Client storefront auth: `camo-web`, `nayadnara`, `@sitehaus/client-sdk/frontend`
  PKCE; the `onehealthclinics` anonymous `/api/ecom` proxy.
- The cookie/transport/CSRF model and Stripe webhook signature verification.

**Out of scope:**

- Non-auth business-logic bugs.
- Deploy/transport hardening beyond what is auth-relevant (F-023 is already logged
  and belongs to an infrastructure workstream).
- Pure UI bugs, performance, accessibility.

## 3. Threat Model

**Threat agents** (priority order):

1. **Malicious / curious tenant merchant** — valid IAM credentials, attempts to
   read or mutate another tenant's commerce data (orders, customers, payouts).
   **Top risk** (multi-tenant isolation; F-011 lives here).
2. **Anonymous internet attacker** — unauthenticated; public endpoints
   (`/auth/login`, `/authorize`, `/token`, `/refresh`), storefronts, gateway
   public routes.
3. **Token / session thief** — holds a stolen access token or `sh_refresh_<key>`
   cookie; tests rotation, reuse detection, session binding.
4. **Compromised / malicious OAuth client** — abuses trust granted via
   `client_key` / `x-client-id` / `x-store-slug`.
5. *(Deprioritized)* Insider — small trusted team.

**Assets:** IAM credentials & PII; access/refresh tokens & sessions; **cross-tenant
commerce data**; Stripe Connect payment capability (financial); role/permission
escalation.

**Trust boundaries scrutinized:** browser↔IAM (token minting); browser↔gateway
(`Bearer` + `x-store-slug` + `store_session`); **gateway↔IAM introspection**
(server-to-server); gateway↔commerce/payments TCP services (internal — are they
authenticated?); header-asserted identity (`client_key` / `x-client-id` /
`x-store-slug`).

## 4. Attack-Surface Decomposition

Five parallel auditor sweeps:

| Sweep | Surface | Primary code |
| ----- | ------- | ------------ |
| **S1** | OAuth issuance & code exchange — PKCE (S256-only/downgrade), `state`/CSRF, `redirect_uri` validation & open-redirect, auth-code single-use/TTL/binding, base64url `oauth_params` tampering, contract↔controller drift (F-003) | `apps/api/src/auth/oauth`, `auth-code`, `packages/sdk/oauth.ts` |
| **S2** | Tokens, sessions & refresh — JWT signing/verification, **alg pinning** (HS256 confusion), claim validation (`aud`/`sid`/`sub`/`mfa`), session binding & revocation, refresh **rotation + reuse detection**, cookie scoping/flags, logout completeness, token-unit mismatch (F-005), dead mfa state (F-006) | `token`, `session`, `cookie`, `packages/sdk/{fetcher,refresh,run-single-refresh}` |
| **S3** | Identity controls — password auth, OTP, 2FA/TOTP (replay, backup codes, partial-token gate), email verification, account recovery, device mgmt, and cross-cutting **rate-limiting / brute-force / user-enumeration** | `auth.controller`, `password`, `otp`, `totp`, `account`, `devices` |
| **S4** | **Authorization & multi-tenancy (hot)** — guard ordering, permission model, IAM→commerce **introspection trust**, `store-resolution.middleware` unverified decode (F-011), `x-client-id`/`x-store-slug` trust, `StoreOwnerGuard`, concrete cross-tenant isolation abuse, TCP-microservice internal auth | `apps/api` guards + `sitehaus-commerce` gateway auth + `@sitehaus/client-sdk` introspection |
| **S5** | Client integration & transport — storefront PKCE, in-memory token storage, client-side `state`, `onehealthclinics` `/api/ecom` proxy, CORS, the Total-Cookie-Protection `sso-link` cookie workaround, **Stripe webhook signature verification** | client sites + `packages/sdk` + gateway webhook handlers |

Each sweep produces candidate findings **and** explicit positive assurances
("checked X, not vulnerable, because…") so the report documents coverage, not just
a bug list.

## 5. Methodology

Per sweep (the Workstream-1 rhythm, security-tuned):

1. **Auditor subagent** — read-only, first-hand code reading, given the sweep's
   reading list + the relevant threat agents. Produces candidate findings (each
   with an exploit/abuse scenario) and positive assurances.
2. **Verifier subagent** — adversarial: attempts to **disprove** each High/Critical
   by tracing the real code path. Kills false positives (which poison a security
   report's credibility).
3. **Synthesis (orchestrator)** — cross-cutting work that cannot be sharded: threat
   model, severity/likelihood normalization, dedup across sweeps, remediation
   sequencing.

**Hard constraints (verbatim from Workstream 1):**

- **READ-ONLY** across all source repos. The only writes are to the local-only
  `security-audit/` directory and the one `.gitignore` line.
- Issues are **logged, never fixed**.
- **Never** reproduce real secrets or real hostnames/IPs. If a secret is found,
  that is a finding — reference it, do not reproduce the value.

## 6. Finding Format

Each finding records:

`ID (F-030+) · title · severity (Critical/High/Medium/Low) · likelihood · impact ·
CWE · affected repos/files · exploit/abuse scenario · recommended fix (sketch)`

## 7. Deliverables & Location

All audit output is **local-only and gitignored** — it is an attacker playbook for
*unremediated* vulnerabilities in a live multi-tenant payment system and must not
be browsable or one deploy away from public.

- **Location:** a gitignored `security-audit/` directory at the repo root
  (co-located with the code for the auditor subagents and future tooling, but
  excluded from git, the Astro build, and turbo).
- **The only committed changes** are (a) adding `security-audit/` to `.gitignore`
  and (b) the F-011/F-021 public-register redactions described below. Nothing else
  in the repo changes.
- **Files (local-only):**
  - `threat-model.md` — actors, assets, trust boundaries, scope.
  - `report.md` — findings S1–S5 in the format above, plus per-sweep coverage
    notes. (Split into per-sweep files if it grows large.)
  - `remediation-plan.md` — every finding sequenced into **P0 / P1 / P2** with fix
    approach, rough effort, affected files, and its `F-###`.
- **New security findings (F-030+) stay local** — they are **not** added to the
  public `apps/docs/findings/` register.
- **No** `apps/docs/security/` section, sidebar entry, or `astro.config.mjs`
  change.

**Public-register cleanup (committed):** Workstream 1 leaked two security-relevant
items into the *public* register — **F-011** (tenant-isolation `jwt.decode`) and
**F-021** (live secrets on disk). As part of this workstream, redact those two
public entries to non-actionable stubs (e.g. "auth hardening tracked privately")
and move their full detail into the local `report.md`.

## 8. Success Criteria

1. All five surfaces (S1–S5) reviewed, each with explicit coverage notes (vulns
   **and** assurances).
2. Every finding carries severity + likelihood + CWE + exploit scenario + fix
   sketch.
3. Every High/Critical independently verified (a disprove-attempt is on record).
4. The remediation plan sequences **all** findings with P0/P1/P2 priorities.
5. **Zero production code changed.** The only committed diff is the `.gitignore`
   line plus the F-011/F-021 register redactions.

## 9. Risks & Constraints

- **False positives** erode trust in a security report — mitigated by the
  adversarial verifier step on every High/Critical.
- **Sensitivity** — see §7; output never enters git, never the docs site.
- **Local-only loss** — the audit is not backed up by the repo; if the report
  needs sharing with Ethan/a new hire, that is a deliberate later step (e.g. a
  sanitized post-remediation writeup), not part of this workstream.
- **Findings-only** — remediation is sketched, not implemented; fixing is its own
  later workstream.

## 10. Out of This Workstream (future)

- Implementing the fixes (separate approved workstream).
- A sanitized, public post-remediation security writeup (optional, later).
- Infrastructure/transport hardening (F-023 and related) — infra workstream.
