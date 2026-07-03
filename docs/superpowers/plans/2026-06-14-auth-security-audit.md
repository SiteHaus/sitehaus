# Auth Security Audit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run a threat-driven security audit of the entire SiteHaus authentication path and produce a local-only threat model, exploit-detailed findings report, and prioritized remediation plan — without changing any production code.

**Architecture:** Five parallel attack-surface sweeps (S1–S5). Each sweep = an **auditor** subagent (implementer: first-hand read-only code reading → candidate findings + positive assurances) followed by a **verifier** subagent (reviewer: adversarially attempts to disprove each Critical/High). The orchestrator owns threat model, severity normalization, dedup, and remediation sequencing. All output is local-only and gitignored.

**Tech Stack:** Targets NestJS 11 (IAM `apps/api` + commerce gateway/services), `@site-haus/sdk`, `@sitehaus/client-sdk` (`/nestjs` + `/frontend`), Next.js storefronts, Drizzle/Postgres, Stripe. Audit artifacts are plain Markdown under a gitignored `security-audit/`.

**Spec:** `docs/superpowers/specs/2026-06-13-auth-security-audit-design.md`

---

## Hard constraints (apply to EVERY task)

- **READ-ONLY across all source repos.** The only files written outside `security-audit/` are: the one `.gitignore` line (Task 0) and the F-011/F-021 register redactions (Task 9).
- **Issues are logged, never fixed.**
- **Never reproduce real secrets or real hostnames/IPs.** A found secret is a finding — reference it, don't reproduce the value.
- **`security-audit/` is gitignored** — its contents are never committed. Sweep tasks therefore have **no commit step**.
- Source repos live at: `~/Dev/sitehaus` (IAM), `~/Dev/sitehaus-commerce` (gateway/services), `~/Dev/camo-web`, `~/Dev/nayadnara`, `~/Dev/onehealthclinics`.

## Finding format (used in `report.md` for every finding)

```
### F-0XX · <title>
- **Severity:** Critical | High | Medium | Low
- **Likelihood:** High | Medium | Low
- **Impact:** <one line>
- **CWE:** CWE-XXX <name>
- **Surface:** S1–S5
- **Affected:** `repo:path/to/file.ts:line`, …
- **Exploit / abuse scenario:** <concrete step-by-step path an attacker takes>
- **Recommended fix:** <sketch>
- **Verifier verdict:** confirmed | refuted | needs-info (+ note)
```

Positive assurances are recorded per sweep as: `✓ Checked <control> — not vulnerable because <reason>`.

---

### Task 0: Scaffold local audit workspace

**Files:**
- Modify: `~/Dev/sitehaus/.gitignore` (append one line) — **committed**
- Create (local-only, gitignored): `~/Dev/sitehaus/security-audit/threat-model.md`, `security-audit/report.md`, `security-audit/remediation-plan.md`

- [ ] **Step 0: Record the pre-audit baseline commit**

Run: `cd ~/Dev/sitehaus && git rev-parse HEAD` and note the SHA as `BASELINE` — Task 10's zero-change check diffs against it.

- [ ] **Step 1: Add the gitignore carve-out**

Append to `~/Dev/sitehaus/.gitignore`:

```
# Local-only auth security audit (Workstream 2) — never commit (contains exploit detail)
/security-audit/
```

- [ ] **Step 2: Verify it's ignored**

Run: `cd ~/Dev/sitehaus && mkdir -p security-audit && touch security-audit/_probe && git status --porcelain security-audit/`
Expected: **no output** (directory is ignored). Then `rm security-audit/_probe`.

- [ ] **Step 3: Create the three skeleton files**

`security-audit/report.md`:
```markdown
# SiteHaus Auth Security Audit — Findings Report
LOCAL-ONLY. Contains exploit detail for unremediated vulnerabilities. Never commit/publish.
Findings continue the F-### series from the public register (last public ID: F-029).

## S1 — OAuth issuance & code exchange
## S2 — Tokens, sessions & refresh
## S3 — Identity controls
## S4 — Authorization & multi-tenancy
## S5 — Client integration & transport
```
`security-audit/threat-model.md` and `security-audit/remediation-plan.md`: a single `# <title>` heading each (filled in Tasks 1 and 8).

- [ ] **Step 4: Commit the gitignore line only**

```bash
cd ~/Dev/sitehaus && git add .gitignore
git commit --no-verify --no-gpg-sign -m ":wrench: Gitignore local security-audit workspace (Workstream 2)"
```
(Hook bypass + unsigned matches the WS1/merge convention; user re-signs at the end.)

---

### Task 1: Write the threat model

**Files:** Create/fill `security-audit/threat-model.md` (local-only — no commit).

- [ ] **Step 1: Transcribe the approved threat model**

Populate `threat-model.md` from spec §3 — the five threat agents (tenant merchant #1, anon attacker, token/session thief, malicious OAuth client, insider), the asset list, and the trust-boundary list. Add a short "How to read this audit" preamble (finding format + that Critical/High are independently verified).

- [ ] **Step 2: Add a per-surface boundary map**

For each of S1–S5, write 1–2 sentences naming the specific trust boundary that sweep stresses (e.g. S4 → "gateway trusts IAM-issued tokens via introspection; tenant identity asserted via `x-client-id`/`x-store-slug`"). This orients each auditor.

No commit (gitignored).

---

### Task 2: Sweep S1 — OAuth issuance & code exchange

**Auditor reading list (read-only, first-hand):**
- `sitehaus:apps/api/src/auth/oauth/oauth.controller.ts`, `oauth.service.ts`, `oauth.module.ts`
- `sitehaus:apps/api/src/auth/auth-code/auth-code.service.ts`
- `sitehaus:apps/api/src/auth/auth.controller.ts` (login / `sso-link` / consent endpoints)
- `sitehaus:packages/sdk/src/oauth.ts`
- `sitehaus:packages/contracts/src/auth.contract.ts` (F-003 drift)
- `sitehaus:apps/dashboard/app/callback/page.tsx` and the dashboard login page

**Threat agents for this sweep:** anonymous attacker, malicious OAuth client.

**Checklist the auditor must address (each → finding or `✓` assurance):**
- PKCE: S256 enforced? `plain`/downgrade rejected? challenge↔verifier compared constant-time?
- `state`/CSRF: required, bound, and validated at callback?
- `redirect_uri`: exact-match against registered URIs? open-redirect via partial match / sub-path / scheme?
- Auth code: single-use, short TTL, bound to client + redirect_uri + PKCE challenge; hashed at rest?
- `oauth_params` base64url round-trip through `sso-link`: tamper/injection (e.g. swap redirect_uri or client_key)?
- `client_id` vs `client_key` contract drift (F-003): does the looser controller surface enable client confusion?
- Consent: can it be skipped/forged to obtain a code for another client?

- [ ] **Step 1: Dispatch the auditor subagent**

Give it the reading list, threat agents, checklist, the [finding format](#finding-format-used-in-reportmd-for-every-finding), and the hard constraints. Instruct it to **write its results directly into `security-audit/report.md` under `## S1`** (findings as `### F-0XX …`, then a `### S1 assurances` block). Start numbering at **F-030**.

- [ ] **Step 2: Dispatch the verifier subagent**

Give it `security-audit/report.md` (S1 section) + the same reading list. Its job: for each **Critical/High**, trace the real code path and try to **disprove** it; append a `Verifier verdict:` line to each. Flag any missed issue it finds.

- [ ] **Step 3: Orchestrator reconciles**

Resolve refuted/needs-info findings (downgrade, drop, or re-examine yourself). Ensure every S1 finding has a verdict and the assurance block is present. No commit.

---

### Task 3: Sweep S2 — Tokens, sessions & refresh

**Auditor reading list:**
- `sitehaus:apps/api/src/auth/token/token.service.ts`
- `sitehaus:apps/api/src/session/session.service.ts`, `session.controller.ts`
- `sitehaus:apps/api/src/auth/cookie/cookies.ts`
- `sitehaus:apps/api/src/auth/auth.service.ts` (`introspect`, `MFA_PENDING_TTL_SEC`)
- `sitehaus:apps/api/src/auth/access/access.guard.ts`
- `sitehaus:packages/sdk/src/fetcher.ts`, `refresh.ts`, `run-single-refresh.ts`, `http.ts`
- `sitehaus:packages/stores/src/auth-store.ts`
- session table schema under `sitehaus:packages/db/src/iam/`

**Threat agents:** token/session thief, anonymous attacker.

**Checklist:**
- JWT: algorithm pinned on **both** sign and verify? (HS256/alg-confusion / `none`)? secret strength source (`JWT_SECRET` vs `JWT_SECRET_B64URL`)?
- Claims validated on every request: `exp`, `aud`, `sid`→live non-revoked session, `sub`?
- Refresh rotation: new token each refresh, old invalidated? reuse-detection wipe correct and not bypassable?
- Cookie flags: `HttpOnly`, `Secure`, `SameSite`, `Domain`, per-client name `sh_refresh_<key>`; legacy unsuffixed fallback — confusion/fixation risk?
- Logout: server-side session revocation, not just client token drop?
- `accessExpiration` unit mismatch (F-005): exploitable (early/late refresh, validation skew)?
- Dead `mfa: "complete"` state (F-006): any auth-relevant consequence?
- Introspection response: does it leak more than the caller should see; cache TTL safe?

- [ ] **Step 1: Dispatch auditor** → writes `## S2` section of `report.md` (continue F-### numbering).
- [ ] **Step 2: Dispatch verifier** → disprove-attempt on each Critical/High; append verdicts.
- [ ] **Step 3: Orchestrator reconciles.** No commit.

---

### Task 4: Sweep S3 — Identity controls

**Auditor reading list:**
- `sitehaus:apps/api/src/auth/auth.controller.ts` (login / register / verify)
- `sitehaus:apps/api/src/auth/password/password.controller.ts` (+ password credential service it calls)
- `sitehaus:apps/api/src/auth/otp/otp.service.ts`
- `sitehaus:apps/api/src/auth/totp/totp.service.ts`
- `sitehaus:apps/api/src/auth/account/account.controller.ts`
- `sitehaus:apps/api/src/devices/devices.service.ts`, `devices.controller.ts`
- `sitehaus:apps/api/src/app.module.ts` + `main.ts` (global throttler/rate-limit config)

**Threat agents:** anonymous attacker, token/session thief.

**Checklist:**
- Password: hashing algorithm + params; constant-time verify; reset-token entropy/TTL/single-use.
- OTP/email-verify: entropy, TTL, attempt-limit, single-use; verification-bypass paths.
- TOTP: replay protection (counter), backup-code hashing + one-time use, the partial-token (`MfaPending`) gate — can 2FA be skipped by replaying a partial token or hitting a non-gated route?
- Rate-limiting / brute-force: are login, OTP, password-reset, 2FA-verify throttled? per-account + per-IP?
- User enumeration: do login/reset/register responses or timing reveal account existence?
- Device management: can a user revoke/forge another user's device binding?

- [ ] **Step 1: Dispatch auditor** → writes `## S3` (continue numbering).
- [ ] **Step 2: Dispatch verifier** → verdicts on Critical/High.
- [ ] **Step 3: Orchestrator reconciles.** No commit.

---

### Task 5: Sweep S4 — Authorization & multi-tenancy (highest priority)

**Auditor reading list:**
- `sitehaus:apps/api/src/auth/access/access.guard.ts`, `permission/permission.guard.ts`, `permission/require-perms.decorator.ts`, `verified/verified.guard.ts`, `mfa/mfa.guard.ts`
- `sitehaus:apps/api/src/auth/auth.service.ts` (`introspect`)
- `sitehaus:packages/client-sdk/src/nestjs/guards/access.guard.ts`, `guards/permission.guard.ts`, `services/introspection.service.ts`, `sitehaus-auth.module.ts`, `types.ts`
- `sitehaus-commerce:apps/gateway/src/store/store-resolution.middleware.ts` (F-011), `admin-store.guard.ts`, `store.service.ts`, `anon-session/anon-session.middleware.ts`
- `sitehaus-commerce:packages/auth/src/guards/storeowner.ts`, `types.ts`
- A representative gateway admin controller (e.g. `sitehaus-commerce:apps/gateway/src/orders/orders.controller.ts`) to see how `x-client-id`/`x-store-slug` + guards combine
- How the gateway calls the TCP services (`apps/gateway/src/app.module.ts` client registrations) — is the gateway↔commerce/payments TCP channel authenticated or implicitly trusted?

**Threat agents:** malicious/curious tenant merchant (PRIMARY), malicious OAuth client.

**Checklist (the core of the whole audit):**
- F-011: `jwt.decode` (unverified) resolves tenant store **before** guards — can a forged/swapped `clientId` claim set `req.store` to another tenant for any pre-guard logic, logging, or error path? Is there any handler reachable before `AccessGuard`?
- Can tenant A reach tenant B's data by manipulating `x-store-slug` / `x-client-id` while holding a valid token for A? (trace store-scoping into the TCP calls)
- Guard ordering: can any sequence skip `AccessGuard`/`StoreOwnerGuard`? `@Public()` over-applied?
- Permission model: `req.client?.id` (header) vs token `aud` fallback — can a first-party client elevate to act as an arbitrary merchant?
- Introspection trust: does the gateway accept the IAM response without binding it to the requested client/store? cache-poisoning or stale-grant window?
- TCP services: are `catalog.*`/`orders.*`/`payments.*` message handlers reachable unauthenticated if the internal network is touched? do they re-check tenant scope or trust the gateway?

- [ ] **Step 1: Dispatch auditor** (allocate extra depth here) → writes `## S4` (continue numbering).
- [ ] **Step 2: Dispatch verifier** → disprove-attempt on **every** finding in this sweep (not just Critical/High), given its centrality.
- [ ] **Step 3: Orchestrator reconciles.** No commit.

---

### Task 6: Sweep S5 — Client integration & transport

**Auditor reading list:**
- `sitehaus:packages/client-sdk/src/frontend/index.ts`
- `camo-web:src/lib/commerce.ts`, `src/app/providers.tsx`, `src/app/login/page.tsx`, `src/app/callback/page.tsx`
- `nayadnara:src/lib/commerce.ts` (+ its login/callback/providers)
- `onehealthclinics:lib/ecom/client.ts`, `next.config.ts` (the `/api/ecom` rewrite + the proxy route handler)
- `sitehaus-commerce:apps/gateway/src/anon-session/anon-session.middleware.ts` + gateway CORS in `main.ts`/bootstrap
- `sitehaus:apps/api/src/main.ts` (CORS) + `auth/cookie/cookies.ts` (the Total-Cookie-Protection `sso-link` workaround)
- Stripe webhook signature verification: `sitehaus-commerce:apps/payments/src/webhook/webhook.handler.ts`, `webhook.service.ts`; `sitehaus:apps/api/src/stripe/stripe-webhook.controller.ts`
- Outbound store-webhook HMAC (`X-SiteHaus-Signature`) — locate in the worker/gateway

**Threat agents:** anonymous attacker, token/session thief, malicious OAuth client.

**Checklist:**
- Storefront token storage: in-memory only confirmed? any `localStorage`/`sessionStorage` access-token leak? XSS→token reach?
- Client-side `state` generation/validation; verifier stashing safe against fixation?
- `/api/ecom` proxy (onehealthclinics): SSRF / open-proxy (does it forward arbitrary paths/hosts)? header smuggling (`x-store-slug` spoof)?
- CORS: gateway + IAM allowlist — wildcard with credentials? reflected origin?
- Cookie partitioning / `sso-link`: does the first-party-cookie workaround widen scope unsafely (cross-client cookie acceptance)?
- Stripe **inbound** webhook: signature verified before processing? replay window? raw-body handling correct?
- Outbound store webhooks: HMAC signing correct; secret per-store; timing-safe compare on the receiver guidance.

- [ ] **Step 1: Dispatch auditor** → writes `## S5` (continue numbering).
- [ ] **Step 2: Dispatch verifier** → verdicts on Critical/High.
- [ ] **Step 3: Orchestrator reconciles.** No commit.

---

### Task 7: Synthesis & normalization

**Files:** finalize `security-audit/report.md` (local-only — no commit).

- [ ] **Step 1: Normalize severity & likelihood**

Re-read all findings end-to-end. Apply one consistent rubric (Critical/High/Medium/Low; High/Medium/Low likelihood). Adjust any outliers so severity is comparable across sweeps. Confirm every finding has a CWE.

- [ ] **Step 2: Dedup & cross-link**

Merge duplicates that surfaced in multiple sweeps (e.g. an introspection issue touching S2 + S4). Add a `Related:` line where findings chain into an attack path. Reference relevant existing public findings (F-003/F-005/F-006/F-011/F-023) by ID.

- [ ] **Step 3: Add the executive summary**

At the top of `report.md`: a count table (by severity, by surface), the 3–5 highest-risk attack paths in plain language, and the overall posture assessment. Confirm each S1–S5 has its assurance block (coverage evidence).

No commit.

---

### Task 8: Remediation plan

**Files:** fill `security-audit/remediation-plan.md` (local-only — no commit).

- [ ] **Step 1: Triage into P0/P1/P2**

P0 = Critical/High with realistic exploit (fix now). P1 = Medium or High-with-mitigations. P2 = Low/hardening. List every finding under exactly one priority.

- [ ] **Step 2: Per-finding remediation entry**

For each finding: `F-### · priority · fix approach (concrete, e.g. "verify JWT before tenant resolution in store-resolution.middleware.ts") · affected files · rough effort (S/M/L) · regression risk · suggested test to prove the fix`.

- [ ] **Step 3: Sequence it**

Order P0s by (impact × ease), noting dependencies (e.g. "rotate the secret found in F-021 before anything else"). End with a one-paragraph "if you only do three things" summary. No commit.

---

### Task 9: Redact the public register

**Files:** Modify `~/Dev/sitehaus/apps/docs/src/content/docs/findings/index.md` (F-011 and F-021 rows) — **committed**.

- [ ] **Step 1: Replace the F-011 row body**

Keep the ID/category/severity columns; replace the Files + Note with a non-actionable stub, e.g. Note: _"Auth/tenant-isolation hardening tracked privately in the Workstream-2 security audit (local). Detail withheld from the public register."_ Remove the specific file:line and the `jwt.decode`/exploit description.

- [ ] **Step 2: Replace the F-021 row body**

Same treatment — stub the secret-on-disk detail (drop the partial key values and path specifics): Note: _"Secret-handling finding tracked privately in the Workstream-2 security audit (local)."_

- [ ] **Step 3: Verify the docs still build**

Run: `cd ~/Dev/sitehaus/apps/docs && pnpm build 2>&1 | grep "internal links"`
Expected: `✓ All internal links are valid.`

- [ ] **Step 4: Commit the redaction**

```bash
cd ~/Dev/sitehaus && git add apps/docs/src/content/docs/findings/index.md
git commit --no-verify --no-gpg-sign -m ":lock: Redact F-011/F-021 detail from public register (tracked privately)"
```

---

### Task 10: Closeout against success criteria

- [ ] **Step 1: Walk the spec's success criteria**

Confirm each: (1) all S1–S5 reviewed with assurance blocks; (2) every finding has severity + likelihood + CWE + exploit scenario + fix; (3) every Critical/High has a verifier verdict; (4) remediation plan covers all findings with P0/P1/P2; (5) zero production code changed.

- [ ] **Step 2: Zero-production-change check**

Run (using `BASELINE` recorded in Task 0 Step 0): `cd ~/Dev/sitehaus && git diff BASELINE HEAD --stat -- . ':!docs/superpowers' ':!apps/docs/src/content/docs/findings/index.md' ':!.gitignore'`
Expected: **empty** (only the gitignore line + the register redaction + the spec/plan changed; `security-audit/` is ignored).

- [ ] **Step 3: Confirm nothing sensitive entered git**

Run: `cd ~/Dev/sitehaus && git status --porcelain security-audit/ && git log --oneline -1 -- security-audit/`
Expected: **no output** for both (workspace ignored; never committed).

- [ ] **Step 4: Report**

Summarize to the user: finding counts by severity/surface, the top attack paths, the P0 list, and that Workstream 3 (dedup/standards) or the fix-implementation workstream is the natural next step. Note the audit lives locally at `security-audit/` and is unbacked-up.

---

## Self-review notes (for the orchestrator)

- The plan adds **no test cycle** (audit, not feature) — intentional; "tests" are the verifier disprove-attempts.
- Spec coverage: S1–S5 (spec §4) → Tasks 2–6; threat model (§3) → Task 1; methodology (§5) → per-task auditor/verifier steps; finding format (§6) → top of plan; deliverables/location (§7) → Tasks 0,7,8 + the gitignore; register redaction (§7) → Task 9; success criteria (§8) → Task 10.
- Numbering: findings are **F-030+**, allocated sequentially as sweeps complete (S1 starts at F-030; later sweeps continue from wherever the previous left off — do not reset per sweep).
