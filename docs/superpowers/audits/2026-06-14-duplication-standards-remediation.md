# SiteHaus Duplication & Standards Audit — Remediation Plan

> Companion to `2026-06-14-duplication-standards-report.md`. Committable (non-sensitive).
> Priority: **P0** = highest leverage / risk-enabler (do first) · **P1** = medium drift cost · **P2** = cosmetic / dead-code / naming.
> Effort: **S** ≈ <½ day · **M** ≈ ½–2 days · **L** ≈ multi-day / cross-repo.
> Disposition: **WS3-fixable** (mechanical, single-repo, do in a later fix workstream) · **→ WS4** (needs abstraction design).

## Triage at a glance

| Priority | Findings |
| --- | --- |
| **P0** | F-059, F-024, F-008, F-018 |
| **P1** | F-013, F-020, F-014, F-015, F-002, F-003 |
| **P2** | F-001, F-006, F-009, F-010, F-012, F-016, F-017, F-019, F-027 |

---

## P0 — highest leverage / enablers

### F-059 · Cross-repo package distribution (keystone)
- **Fix:** Stand up a publish pipeline for `@sitehaus-ecom/contracts` and `@sitehaus/client-sdk` (npm or a private registry; or a workspace spanning the repos). Consumers switch from hand-redeclaration / `file:` tarball to versioned deps.
- **Affected:** `sitehaus-commerce:packages/contracts`, `sitehaus:packages/client-sdk` (publish); `sitehaus:apps/commerce`, `camo-web`, `nayadnara` (consume).
- **Effort:** M · **Regression risk:** Low (additive; consumers cut over one at a time) · **Disposition:** → WS4 (do first — unblocks F-013 + F-020 and de-risks the storefront-kit).

### F-024 · Platform CI test gate + baseline suite (risk multiplier)
- **Fix:** Add a `test` task to `sitehaus:.github/workflows/ci.yml` (it runs `check-types lint build` only today) **and** seed a baseline suite — at minimum the auth API service layer and the dashboard data hooks — so the F-014/F-015 migrations land with coverage. The platform has ≈1 test file today.
- **Affected:** `sitehaus:.github/workflows/ci.yml:50`, new `*.spec.ts` under `apps/api` + `apps/dashboard`.
- **Effort:** L (suite) · **Regression risk:** Low (additive) · **Disposition:** WS3-fixable (CI step) + larger (suite). **Sequencing: tests before the dashboard refactors.**

### F-008 · Storefront commerce client triplication
- **Fix:** Extract the camo/naya client + `commerce` DTOs into `@sitehaus/storefront-kit`; adapt onehealthclinics' structurally-different `lib/ecom` variant onto the same package (its `/api/ecom` proxy becomes a `transport:'proxy'` option).
- **Affected:** `camo-web:src/lib/commerce.ts`+`types`, `nayadnara:src/lib/commerce.ts`+`types`, `onehealthclinics:lib/ecom/client.ts`.
- **Effort:** L · **Regression risk:** Medium (3 live storefronts) · **Disposition:** → WS4 (depends on F-059 for distribution). See WS4 handoff.

### F-018 · nayadnara fork of camo-web
- **Fix:** Extract the near-identical auth/commerce core (the low-diff stratum) into the storefront-kit; keep the divergent content layer per-site; **back-port nayadnara's safety improvements** (`safe-next`, OAuth state-presence check — cf. WS2 F-056 where camo lacks it, lazy QueryClient) into the kit baseline so camo gains them.
- **Affected:** `camo-web:src/` ↔ `nayadnara:src/` (core stratum only).
- **Effort:** L · **Regression risk:** Medium · **Disposition:** → WS4. See WS4 handoff.

---

## P1 — medium drift cost

### F-013 · Admin UI hand-redeclares commerce contracts
- **Fix:** After F-059, import `@sitehaus-ecom/contracts` in `apps/commerce` and delete the 55 wrappers + 39 type decls in `lib/commerce.ts`.
- **Affected:** `sitehaus:apps/commerce/lib/commerce.ts`. **Effort:** M · **Risk:** Medium · **Disposition:** → WS4 (**blocked on F-059**).

### F-020 · client-SDK vendored as a tarball
- **Fix:** After F-059, replace the `file:./vendor/...tgz` deps in camo/naya with a versioned range; delete the `vendor/` tarballs.
- **Affected:** `camo-web:package.json`+`vendor/`, `nayadnara:package.json`+`vendor/`. **Effort:** S (after F-059) · **Risk:** Low · **Disposition:** → WS4 (**blocked on F-059**).

### F-014 · 10 dashboard pages fetch outside React Query
- **Fix:** Migrate each page's inline `useEffect`+`getApi/fetch` to a colocated `use-*.ts` React Query hook keyed via `lib/query-keys` (the pattern already exists in sibling hooks).
- **Affected:** the 10 `(dashboard)/**/page.tsx` listed in the report. **Effort:** M (10×S) · **Risk:** Low-Medium (loading/error states) · **Disposition:** WS3-fixable. **Do after F-024.**

### F-015 · Fat `page.tsx` (11 of 21 >100 lines)
- **Fix:** Extract each fat page's inline view into `_components/`, leaving `page.tsx` as role-dispatch (≤15 lines). Pairs with F-014 (same pages).
- **Affected:** the 11 fat pages listed in the report. **Effort:** L · **Risk:** Low · **Disposition:** WS3-fixable. **Do with F-014, after F-024.**

### F-002 · IAM API doesn't bind ts-rest contracts
- **Fix:** Either (a) adopt the commerce `tsRestHandler` pattern (F-009) across auth controllers — also closes the WS2 contract-unenforced root — or (b) the minimal honest fix: add a global `ValidationPipe` and correct the `apps/api/CLAUDE.md` claim.
- **Affected:** `sitehaus:apps/api/src/auth/**`, `apps/api/CLAUDE.md`. **Effort:** L (full) / S (doc + pipe) · **Risk:** Medium · **Disposition:** WS3-fixable (doc/pipe) or larger refactor.

### F-003 · OAuth `client_id`/`client_key` contract drift
- **Fix:** Reconcile contract↔controller (one client identifier, enforced). **Same change as WS2 F-031** — fix once, satisfies both the standards and security findings.
- **Affected:** `sitehaus:packages/contracts/src/auth.contract.ts:190`, `apps/api/src/auth/oauth/oauth.controller.ts:161`. **Effort:** M · **Risk:** Medium (clients send `client_key`) · **Disposition:** tracked jointly with WS2 F-031.

---

## P2 — cosmetic / dead-code / naming

### F-016 · Duplicated audit-label maps
- **Fix:** Extract one `formatAuditAction(action, opts?)` into `apps/dashboard/lib/`; consume from both `tickets/[ticketId]/page.tsx` and `audit-log-view.tsx`. **Effort:** S · **Risk:** Low · **Disposition:** WS3-fixable.

### F-010 · `ReturnRequested` ← `refund-requested.tsx` mismatch
- **Fix:** Confirm the intended email copy, then rename `refund-requested.tsx` → `return-requested.tsx` (and fix the `index.ts:7` export) or repoint `ReturnRequested`. **Effort:** S · **Risk:** Low (verify rendered email) · **Disposition:** WS3-fixable.

### F-012 · `shipping.shemas.ts` typo
- **Fix:** `git mv shipping.shemas.ts shipping.schemas.ts` + update the one importer (`packages/validation/src/index.ts:16`). **Effort:** S · **Risk:** Low (single importer) · **Disposition:** WS3-fixable.

### F-006 · Dead `mfa:'complete'` literal
- **Fix:** Drop `'complete'` from the `AccessPayload['mfa']` union (`access.guard.ts:22,31`). Cross-ref WS2 S2 assurance (proven no-op). **Effort:** S · **Risk:** Low · **Disposition:** WS3-fixable.

### F-017 · `/design` showcase page in the authed bundle
- **Fix:** Delete the route (or move to a dev-only/Storybook target outside the bundle). Also clears the largest F-015 offender. **Effort:** S · **Risk:** Low (unreferenced) · **Disposition:** WS3-fixable.

### F-027 · Orphan `create_network.sh`
- **Fix:** Wire prod compose to `external: sitehaus-prod-network` or delete the script (confirm with infra/deploy owner). **Effort:** S · **Risk:** Low · **Disposition:** WS3-fixable.

### F-019 · Storefront auth-page styling drift
- **Fix:** No standalone fix — folds into the WS4 storefront-kit as a theming requirement (shared auth pages use tokens; each site themes them). **Effort:** — · **Disposition:** → WS4.

### F-009 · Commerce binds contracts (positive)
- **Fix:** None — reference implementation for F-002. **Disposition:** reference (no action).

### F-001 · Storefront auth files shared camo↔naya
- **Fix:** Folded into F-018 (the auth-pages subset of the fork core). **Disposition:** → WS4 (do not double-count).

---

## Shared-abstraction candidates → WS4 handoff

This is the explicit input to Workstream 4. Three extractions, one prerequisite:

**0. Prerequisite — F-059 distribution pipeline.** Publish `@sitehaus-ecom/contracts` and `@sitehaus/client-sdk` as consumable packages. Everything below assumes a real distribution channel exists. **Effort M; do first.**

**1. `@sitehaus/storefront-kit` (F-008 + F-018 + F-001 + F-019).** Extract the near-identical storefront auth/commerce core:
- *In scope (low-diff, extraction-ready):* `lib/commerce.ts` client, `types/commerce.ts` DTOs, `lib/cart-store.ts`, `app/{login,callback}/page.tsx`, `app/providers.tsx`, `components/require-auth.tsx`, `components/merch/{variant-picker,add-to-cart-button,product-actions}.tsx`.
- *Out of scope (per-site, high-diff):* `app/page.tsx`, `layout.tsx`, `globals.css`, marketing/content routes.
- *Design requirements:* (a) `createCommerceClient({ baseUrl, storeSlug, transport: 'direct' | 'proxy' })` so onehealthclinics' `/api/ecom` proxy is an option, not a fork; (b) **theming abstracted** (tokens, not hardcoded `bg-black`/`text-black`) per F-019; (c) **back-port nayadnara's safety deltas** as the baseline (`safe-next`, OAuth state-presence check, lazy QueryClient). *Cost: L. Reconciling 3 sites incl. the ohc structural variant is the main risk.*

**2. Commerce contracts import (F-013).** Once F-059 publishes `@sitehaus-ecom/contracts`, `sitehaus:apps/commerce` imports it and deletes ~94 hand-redeclared decls. *Cost: M, blocked on F-059.*

**3. SDK de-vendoring (F-020).** Once F-059 publishes the SDK, camo/naya swap `file:` tarballs for versioned deps. *Cost: S, blocked on F-059.*

---

## Sequencing

**Wave 1 — enablers (do before the rest):**
1. **F-059** — package distribution pipeline (unblocks F-013, F-020, and the storefront-kit channel).
2. **F-024** — CI `test` step + baseline suite (so refactors land covered).

**Wave 2 — trivial WS3-fixable hygiene (parallel, low-risk, no deps):**
3. **F-016** (one label helper), **F-012** (rename), **F-006** (drop dead union member), **F-017** (delete `/design`), **F-010** (template name), **F-027** (orphan script).

**Wave 3 — dashboard standards mass-fix (after F-024):**
4. **F-014 + F-015 together** — per page: inline fetch → `use-*` hook, inline view → `_components/`. ~11 pages.

**Wave 4 — WS4 structural (after F-059):**
5. **F-013 + F-020** — import contracts / de-vendor SDK (mechanical once published).
6. **`@sitehaus/storefront-kit`** — F-008 + F-018 + F-001 + F-019 (the design-heavy extraction; WS4's main body).
7. **F-002 / F-003** — adopt the F-009 ts-rest pattern in the IAM API (also closes WS2 F-031); larger refactor, sequence with the WS2 fix runway.

### Dependency notes
- **F-024 before Wave 3** — never run the dashboard migrations against ≈zero tests.
- **F-059 before F-013/F-020 and the storefront-kit** — they're all blocked on distribution.
- **F-003 ↔ WS2 F-031** and **F-002 ↔ WS2 ValidationPipe** — coordinate with the security fix runway; fix once.

### If you only do three things
1. **F-059** — publish the contracts + SDK (the keystone that unblocks the most).
2. **F-024** — add a CI test step + seed a baseline suite before any refactor.
3. **Bundle F-016 + F-006 + F-012 + F-017** — the zero-risk single-repo wins, landable today.
