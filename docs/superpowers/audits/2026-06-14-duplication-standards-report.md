# SiteHaus Duplication & Standards Audit — Findings Report

Workstream 3. Committable (code-quality, not exploit detail). Continues the F-### register; net-new at F-059+.
Spec: `docs/superpowers/specs/2026-06-14-duplication-standards-audit-design.md` · Plan: `docs/superpowers/plans/2026-06-14-duplication-standards-audit.md`

## Executive summary

19 findings across four sweeps: the 18 WS1 seed findings (all re-confirmed current at HEAD) plus one net-new synthesis finding (**F-059**, the cross-repo package-distribution gap). One seed (**F-004**) was already fixed during WS1 and is logged as a closed assurance. Findings are committable (code-quality, not exploit detail).

### Counts

| Severity | Count | Findings |
| --- | --- | --- |
| **High** | 2 | F-008, F-018 |
| **Medium** | 8 | F-001, F-003, F-013, F-014, F-015, F-020, F-024, F-059 |
| **Low** | 9 | F-002, F-006, F-009, F-010, F-012, F-016, F-017, F-019, F-027 |

| Category | Count |
| --- | --- |
| duplication | 7 (F-001, F-008, F-013, F-016, F-018, F-020, F-059) |
| standards | 7 (F-002, F-003, F-009, F-014, F-015, F-019, F-024) |
| naming | 2 (F-010, F-012) |
| dead-code | 3 (F-006, F-017, F-027) |

| Disposition | Count | Findings |
| --- | --- | --- |
| **WS3-fixable** (mechanical, single-repo) | 8 | F-006, F-010, F-012, F-014, F-015, F-016, F-017, F-027 |
| **→ WS4** (structural / cross-repo) | 6 | F-001, F-008, F-013, F-018, F-019, F-020 (all unblocked by **F-059**) |
| **flagged / reference / closed** | 5 | F-002 (doc-fix + larger), F-003 (joint w/ WS2 F-031), F-009 (reference), F-024 (CI + suite), F-004 (closed) |

### Highest-leverage cleanups (plain language)

1. **Stand up cross-repo package distribution (F-059) — the keystone.** Neither the commerce contracts (`@sitehaus-ecom/contracts`) nor the client-SDK (`@sitehaus/client-sdk`) is published as a consumable package, which *forces* the admin UI to hand-redeclare 94 contract decls (F-013) and the storefronts to vendor a byte-identical tarball (F-020). One publishing pipeline dissolves both and gives the storefront-kit a real channel. **Do this first in WS4.**
2. **Extract `@sitehaus/storefront-kit` (F-008/F-018/F-001/F-019).** The camo-web↔nayadnara auth+commerce core is near-identical (`commerce.ts` 1-line diff, `types` 6, cart-store 25, login 27, callback 25, providers 36); the content layer (page/layout/marketing, 100–230-line diffs) is genuinely per-site and stays. Extract the core, reconcile onehealthclinics' structurally-different variant, and abstract theming (F-019). Largest single dedup.
3. **Dashboard standards mass-fix (F-014 + F-015) — but gated on tests (F-024).** The same ~11 pages both fetch outside React Query *and* exceed the ≤15-line page rule; fix them together (inline fetch → `use-*` hook, inline view → `_components/`). First build a baseline test suite, because today the platform has **≈1 test file** and CI has **no test step** — every refactor would land uncovered.
4. **Bundle the trivial wins (F-016, F-010, F-012, F-006, F-017, F-027).** One extracted label helper, one template-name fix, one filename rename, three reference-proven deletions — all single-repo, low-risk hygiene.

### Posture assessment

The platform is **well-documented but weakly-enforced**: the dashboard violates its *own written* standards (the ≤15-line page rule, the React-Query rule) in the majority of non-trivial pages, and the IAM API's CLAUDE.md claims a ts-rest binding it never does — while the commerce gateway proves the pattern is achievable (F-009, 18 bound controllers). The duplication is **concentrated and structural**, not scattered: a single root cause (no cross-repo distribution, F-059) drives the contract/SDK copies, and a single fork (camo→nayadnara) drives the storefront triplication — both WS4-shaped, both now sized. The cross-cutting risk multiplier is **F-024**: with essentially no test suite, the otherwise-safe WS3-fixable migrations carry more regression risk than their size suggests, so a test baseline should precede the dashboard mass-fix. Every sweep carries an assurance block documenting coverage (and F-004's already-fixed closure).

### If you only do three things

1. **F-059** — publish the commerce contracts + client-SDK (unblocks the most downstream cleanup).
2. **F-024** — add a CI `test` step and seed a baseline suite *before* the dashboard refactors.
3. **F-016 + F-006 + F-012 + F-017** — land the trivial WS3-fixable wins now (one helper, one rename, two deletes) for immediate, zero-risk hygiene.

---

## Sweep A — Cross-repo duplication & fork divergence

### F-008 · Storefront commerce client triplicated (camo-web / nayadnara / onehealthclinics)
- **Category:** duplication · **Severity:** High · **Scope-size:** 3 implementations; 2 near-identical (camo/naya `src/lib/commerce.ts` + `src/types/commerce.ts`), 1 structural variant (ohc `lib/ecom/client.ts`)
- **Currency:** present (camo↔naya `commerce.ts` differ by **1 line**, `types/commerce.ts` by **6 lines** — both comment-level; matches WS1)
- **Affected:** `camo-web:src/lib/commerce.ts`+`src/types/commerce.ts`, `nayadnara:src/lib/commerce.ts`+`src/types/commerce.ts`, `onehealthclinics:lib/ecom/client.ts`
- **Why it matters:** Three hand-maintained copies of the storefront↔commerce-gateway client; a contract change (or a security fix like F-053/F-056) must land in three places and already drifts (ohc has 8 exports/proxy pattern vs camo's 2).
- **Deepened instances:** camo/naya are a near-verbatim pair (extraction-ready). **onehealthclinics is NOT a near-copy** — `lib/ecom/client.ts` (4231 B, 8 exports, `./types` import, browser-proxies through `/api/ecom`) is a *structurally different* third implementation. Extraction must reconcile two shapes, not three copies.
- **Recommended remediation:** Extract the camo/naya client + types into `@sitehaus/storefront-kit`; adapt onehealthclinics onto the same package (its proxy/ITP needs become a kit option). See WS4 handoff.
- **Effort:** L · **Regression risk:** Medium (three live storefronts cut over)
- **Disposition:** → **WS4** (extraction sketch: kit exports `createCommerceClient({ baseUrl, storeSlug, transport: 'direct' | 'proxy' })` + shared `commerce` DTOs; camo/naya drop their copies, ohc drops its variant and passes `transport:'proxy'`).
- **Related:** F-001, F-018, F-019, F-059.

### F-018 · nayadnara is a fork of camo-web (not just shared files)
- **Category:** duplication · **Severity:** High · **Scope-size:** 22 of 33 naya `src/` files share a camo path (camo has 48 total)
- **Currency:** present (22 shared paths confirmed at HEAD; matches WS1)
- **Affected:** `camo-web:src/` ↔ `nayadnara:src/` (whole tree)
- **Why it matters:** A fork that silently diverges. nayadnara's real improvements (`safe-next` open-redirect sanitizer, OAuth state-presence check — cf. WS2 **F-056** where camo lacks it, lazy QueryClient, per-mutation loading guards) were **never back-ported to camo-web**; the two keep drifting.
- **Deepened instances (per-file diff size, shared files):** Two distinct strata. **Auth/commerce CORE is near-identical and extraction-ready:** `commerce.ts` (1), `product-actions.tsx` (2), `types/commerce.ts` (6), `add-to-cart-button.tsx` (7), `variant-picker.tsx` (21), `callback/page.tsx` (25), `cart-store.ts` (25), `login/page.tsx` (27), `providers.tsx` (36). **Content/marketing layer diverges heavily and must stay per-site:** `page.tsx` (230), `globals.css` (153), `layout.tsx` (148), `account/orders` (116), `shows` (101), `music` (101), `merch` (68). This split *is* the extraction boundary.
- **Recommended remediation:** The near-identical core → `@sitehaus/storefront-kit` (WS4); the divergent content layer stays per-site. Back-port nayadnara's safety improvements to camo as part of the kit baseline.
- **Effort:** L · **Regression risk:** Medium · **Disposition:** → **WS4**
- **Related:** F-008, F-019, F-056 (WS2).

### F-001 · Storefront auth/commerce files shared camo↔nayadnara
- **Category:** duplication · **Severity:** Medium · **Scope-size:** subsumed by F-018's core stratum
- **Currency:** present — this is the auth-pages subset of the F-018 fork (login/callback/providers/require-auth/cart-store).
- **Affected:** `camo-web:src/app/{login,callback}/page.tsx`+`src/app/providers.tsx`+`src/components/require-auth.tsx`+`src/lib/cart-store.ts` ↔ same in `nayadnara`.
- **Why it matters / remediation:** Same root as F-018; the auth pages are the highest-value, lowest-diff extraction targets. **Folded into the F-018 → WS4 storefront-kit handoff** (do not double-count).
- **Effort:** — (folded) · **Disposition:** → **WS4** · **Related:** F-008, F-018.

### F-013 · Commerce admin UI hand-redeclares the commerce contracts
- **Category:** duplication · **Severity:** Medium · **Scope-size:** `sitehaus:apps/commerce/lib/commerce.ts` = ~20.5 KB, **55 endpoint wrappers + 39 type/interface decls** redeclared by hand
- **Currency:** present (0 imports of the commerce contracts; confirmed at HEAD)
- **Affected:** `sitehaus:apps/commerce/lib/commerce.ts`, `sitehaus-commerce:packages/contracts/src/`
- **Why it matters:** Two hand-maintained type surfaces for one API (the gateway already binds `@sitehaus-ecom/contracts`; the :3004 admin UI re-types all of it). Drift risk on every contract change.
- **Deepened root cause:** `apps/commerce` depends on `@site-haus/contracts` (the **IAM** contracts, workspace) but the **commerce** contracts (`@sitehaus-ecom/contracts`) live in the *separate* `sitehaus-commerce` repo and are **not published / not workspace-linked into `sitehaus`**. So the redeclaration isn't laziness — it's forced by a cross-repo package-distribution gap (the same gap as F-020). Fixing F-013 *requires* making the commerce contracts consumable from `sitehaus` first.
- **Recommended remediation:** Publish `@sitehaus-ecom/contracts` (npm or a consumable artifact) and import it in `apps/commerce`, deleting the hand-redeclared surface. Blocked on the distribution fix (F-059).
- **Effort:** M (after distribution) · **Regression risk:** Medium · **Disposition:** → **WS4** (depends on F-059).
- **Related:** F-020, F-059, F-002/F-009.

### F-016 · Audit-action label formatting duplicated in the dashboard
- **Category:** duplication · **Severity:** Low · **Scope-size:** 2 independent action→label maps
- **Currency:** present — `formatAuditAction(action,meta,staffMap)` + `switch` at `tickets/[ticketId]/page.tsx:46-52`; `formatAction(action)` + `ACTION_MAP` at `audit-logs/_components/audit-log-view.tsx:120-125`.
- **Affected:** `sitehaus:apps/dashboard/app/(dashboard)/tickets/[ticketId]/page.tsx:46`, `sitehaus:apps/dashboard/app/(dashboard)/audit-logs/_components/audit-log-view.tsx:124`
- **Why it matters:** Two action→label maps over the same `ticket.*` action strings, drifting independently; neither lives in `lib/`. The dashboard standard says "extract on third use" — these overlap at two and should consolidate.
- **Deepened instances:** No third instance found. The `tickets` variant additionally interpolates `meta`/`staffMap`, so the shared helper needs an optional-meta signature.
- **Recommended remediation:** Extract one `formatAuditAction(action, opts?)` into `apps/dashboard/lib/` and consume from both. WS3-fixable (single-repo, mechanical).
- **Effort:** S · **Regression risk:** Low · **Disposition:** WS3-fixable.

### F-020 · `@sitehaus/client-sdk` vendored as a byte-identical tarball
- **Category:** duplication · **Severity:** Medium · **Scope-size:** 2 identical vendored tarballs (md5 `ef230028…`, v0.4.0)
- **Currency:** present — `camo-web` + `nayadnara` both `"@sitehaus/client-sdk": "file:./vendor/sitehaus-client-sdk-0.4.0.tgz"`, identical md5. (onehealthclinics does **not** use the SDK — it has its own `lib/ecom` client, consistent with F-008.)
- **Affected:** `camo-web:package.json`+`vendor/`, `nayadnara:package.json`+`vendor/`
- **Why it matters:** A hand-managed binary with no update path; two copies that must be re-vendored in lockstep on every SDK change. WS1's ecosystem-map claimed npm v0.3.0 — three mismatches (vendored vs npm, v0.4.0 vs v0.3.0, no update path).
- **Recommended remediation:** Publish `@sitehaus/client-sdk` to npm (or a private registry) and replace the `file:` deps with a versioned range. Part of the cross-repo distribution fix (F-059).
- **Effort:** M · **Regression risk:** Low · **Disposition:** → **WS4** (with F-059).
- **Related:** F-013, F-059.

### F-059 · (net-new) Cross-repo package-distribution gap forces redeclaration + vendoring
- **Category:** duplication (root cause) · **Severity:** Medium · **Scope-size:** root cause behind F-013 + F-020
- **Currency:** net-new (synthesis of F-013 + F-020)
- **Affected:** `sitehaus-commerce:packages/contracts`, `sitehaus:packages/client-sdk` (publish targets), consumers `sitehaus:apps/commerce`, `camo-web`, `nayadnara`
- **Why it matters:** Neither the commerce contracts nor the client-SDK is published as a consumable package across repo boundaries, so consumers either **hand-redeclare** the types (F-013) or **vendor a tarball** (F-020). Both seed findings are symptoms; the cure is one decision: a publishing pipeline (npm/private registry, or a workspace that spans the repos).
- **Recommended remediation:** Stand up a publish step for `@sitehaus-ecom/contracts` and `@sitehaus/client-sdk`; consumers switch to versioned deps. This is the **keystone of the WS4 handoff** — it unblocks F-013 and F-020 and de-risks the storefront-kit (F-008/F-018) by giving it a real distribution channel.
- **Effort:** M · **Regression risk:** Low · **Disposition:** → **WS4** (do first).
- **Related:** F-013, F-020, F-008.

### Sweep A assurances
- ✓ **Seed citations all current** — every Sweep-A seed finding (F-001/008/013/016/018/020) was re-confirmed at HEAD; none already-fixed, none moved paths.
- ✓ **camo↔naya core duplication is true duplication, not a deliberate fork point** — the 1–36-line diffs in the auth/commerce core are incidental drift (comments, a back-ported safety check), not intentional per-site behavior, so extraction is safe. The *content* layer (100–230-line diffs) is genuinely per-site and correctly excluded from extraction.

## Sweep B — Standards conformance: sitehaus dashboard + IAM

> **Documented standard (audited against):** `apps/dashboard/CLAUDE.md` — "all async data via React Query, never fetch in components directly"; "`page.tsx` is role-dispatch only (≤15 lines); all view components in `_components/`". `apps/api/CLAUDE.md` — "Controllers bind to ts-rest contracts." These are *written* standards, so violations are scored (not "candidate to ratify").

### F-014 · 10 dashboard pages fetch in `useEffect` instead of React Query
- **Category:** standards · **Severity:** Medium · **Scope-size:** **10** `page.tsx` use `useEffect`; **9** call `getApi()`/`fetch()` directly inside it
- **Currency:** present (exactly 10 at HEAD; matches WS1's list — **no hidden extras**, the grep set equals the WS1 set)
- **Affected:** `tickets/[ticketId]/edit`, `profile`, `projects`, `tickets/new`, `clients/[clientId]/business-profile`, `projects/[projectId]`, `tickets`, `tickets/[ticketId]`, `projects/[projectId]/edit` (+ `projects/new` uses `useEffect` non-fetch) under `sitehaus:apps/dashboard/app/(dashboard)/`
- **Why it matters:** Bypasses React Query's cache/retry and the `lib/query-keys` factories — the single worst standards drift in the dashboard (the colocated `hooks/use-*.ts` already show the correct pattern; these pages just don't use them).
- **Deepened instances:** None beyond the WS1 ten — the dashboard-wide grep for `useEffect`+`getApi/fetch` in `page.tsx` returns exactly this set. Scope is bounded.
- **Recommended remediation:** Migrate each page's inline fetch to a colocated `use-*.ts` React Query hook keyed via `lib/query-keys` (the pattern already exists). WS3-fixable but per-page (10×S).
- **Effort:** M (10 small migrations) · **Regression risk:** Low-Medium (loading/error states change) · **Disposition:** WS3-fixable.
- **Related:** F-015 (the same fat pages), F-024 (no test gate to catch regressions).

### F-015 · Fat `page.tsx` files — view layer not extracted (worse than WS1 reported)
- **Category:** standards · **Severity:** Medium · **Scope-size:** **11 of 21** dashboard `page.tsx` are >100 lines; only **6** are compliant-thin (≤15)
- **Currency:** present — **deepened: WS1 listed 7, the true count is 11.**
- **Affected (line counts at HEAD):** `projects/[projectId]/edit` (431), `design` (411, also dead — F-017), `tickets/[ticketId]` (409), `projects/[projectId]` (367), `clients/[clientId]/business-profile` (322), `tickets` (252), `projects/[projectId]/design-document` (244), `tickets/[ticketId]/edit` (172), `projects` (160), `projects/new` (117), `projects/[projectId]/design-document/versions/[version]` (101)
- **Why it matters:** The standard (`CLAUDE.md:8`, "role-dispatch only ≤15 lines; views in `_components/`") is violated by the **majority** of non-trivial pages — 240–431-line files of inline JSX/logic with no extracted view component.
- **Deepened instances:** +4 beyond WS1: `design-document` (244), `tickets/[ticketId]/edit` (172), `projects` (160), `projects/new` (117), `versions/[version]` (101).
- **Recommended remediation:** Extract each fat page's view into `_components/`, leaving `page.tsx` as role dispatch. Pairs naturally with the F-014 migration (the same pages). WS3-fixable, per-page.
- **Effort:** L (11 extractions) · **Regression risk:** Low · **Disposition:** WS3-fixable.
- **Related:** F-014, F-017 (`design` is both fat *and* dead).

### F-002 · IAM API does not bind ts-rest contracts (doc/standard vs reality)
- **Category:** standards · **Severity:** Low · **Scope-size:** **0** of all `apps/api/src` controllers use `@TsRestHandler` (ecosystem-wide miss)
- **Currency:** present — confirmed 0 ts-rest bindings in the entire IAM API at HEAD.
- **Affected:** `sitehaus:apps/api/CLAUDE.md` (the claim), `sitehaus:apps/api/src/auth/**` (plain NestJS controllers that hand-`schema.parse`)
- **Why it matters:** `apps/api/CLAUDE.md` states "Controllers bind to ts-rest contracts," but no controller does — contracts only type the SDK, never enforced server-side. This is the same gap WS2 flagged (no global `ValidationPipe` → the zod contract is dead at runtime, root of WS2 F-030/F-031/F-035).
- **Recommended remediation:** Either (a) adopt the commerce pattern (`tsRestHandler`, see F-009) across auth controllers, or (b) add a global `ValidationPipe` and correct the CLAUDE.md claim. Option (a) also closes the WS2 contract-unenforced root.
- **Effort:** L (controller-by-controller) or S (ValidationPipe + doc fix) · **Regression risk:** Medium · **Disposition:** WS3-fixable (doc fix) / → larger refactor (full binding).
- **Related:** F-003, F-009 (the positive pattern), WS2 F-030/F-031.

### F-003 · OAuth contract drift (`client_id` uuid vs controller `client_key`)
- **Category:** standards · **Severity:** Medium · **Scope-size:** 2 endpoints (`authorize`, `token`)
- **Currency:** present — **already independently confirmed by WS2 as F-031** (which proved the security impact: client confusion + unenforced contract).
- **Affected:** `sitehaus:packages/contracts/src/auth.contract.ts:190`, `sitehaus:apps/api/src/auth/oauth/oauth.controller.ts:161`
- **Why it matters:** The typed contract (`client_id: z.uuid()`, form-encoded) does not match the implemented surface (accepts `client_key` or `client_id`, JSON or form). Standards drift *and* the WS2 security finding F-031 are the same fix.
- **Recommended remediation:** Reconcile contract↔controller (pick one client identifier, enforce it). **Cross-reference WS2 F-031** — fix once, satisfies both.
- **Effort:** M · **Regression risk:** Medium (clients send `client_key` today) · **Disposition:** WS3-flagged, fix tracked jointly with WS2 F-031.
- **Related:** WS2 F-031, F-002.

### F-024 · Platform CI has no test gate — and ≈no tests to run
- **Category:** standards · **Severity:** Medium · **Scope-size:** CI runs `check-types lint build`, **0** test step; whole `sitehaus` tree has **1** spec/test file
- **Currency:** present — **deepened: not just "tests not run" — the platform has essentially no test suite** (1 `*.spec/test.ts` in all of `apps/` + `packages/`), unlike `sitehaus-commerce` which runs `pnpm test` in CI.
- **Affected:** `sitehaus:.github/workflows/ci.yml:50` (`pnpm turbo run check-types lint build`, no `test`)
- **Why it matters:** The production deploy path has no automated test gate, and there is almost nothing to gate — every WS3-fixable migration (F-014/F-015) would land with zero test coverage to catch regressions. This is the structural risk multiplier for the whole cleanup.
- **Recommended remediation:** Add a `test` task to the platform CI **and** seed a baseline test suite (at least for the auth API and the dashboard data hooks) before the F-014/F-015 mass migrations. Sequencing dependency: tests before refactors.
- **Effort:** L (build the suite) · **Regression risk:** Low (additive) · **Disposition:** WS3-fixable (CI step) + → larger (test suite).

### Sweep B assurances
- ✓ **F-004 already fixed (assurance, not a finding)** — the architecture-doc token-storage claim was *corrected during the WS1 sweep* (`apps/docs/.../architecture/auth.md` now states in-memory-only Zustand, hardcoded `MFA_PENDING_TTL_SEC`, per-client `sh_refresh_<key>`). Confirmed at HEAD; no residual drift. Logged closed.
- ✓ **F-014 scope is bounded** — the dashboard-wide grep confirms exactly the WS1 ten pages fetch outside React Query; no additional offenders hiding.
- ✓ **The standards audited here are *written*** — both the React-Query rule and the ≤15-line page rule are quoted from `apps/dashboard/CLAUDE.md`; these are scored violations, not "candidate standards."

## Sweep C — Standards & naming: commerce + storefronts

### F-009 · Commerce gateway binds ts-rest contracts (positive contrast to F-002)
- **Category:** standards (positive) · **Severity:** Low (informational) · **Scope-size:** **18** gateway controllers use `@TsRestHandler`/`tsRestHandler`
- **Currency:** present — confirmed 18 ts-rest-bound controllers in `sitehaus-commerce:apps/gateway/src/` at HEAD.
- **Affected:** `sitehaus-commerce:apps/gateway/src/**`, `sitehaus-commerce:packages/contracts/src/`
- **Why it matters:** This is the **target pattern**: the commerce gateway validates against `@sitehaus-ecom/contracts` server-side, the opposite of the IAM API (F-002, 0 bindings). The "two repos both have contracts" claim means different things — commerce *enforces*, IAM only *types*.
- **Recommended remediation:** No fix needed here. Use as the reference implementation when remediating F-002. **Links Sweep B↔C.**
- **Effort:** — · **Disposition:** reference (no action) · **Related:** F-002, F-013, F-059.

### F-010 · Email-template export/file-name mismatch (`ReturnRequested` ← `refund-requested.tsx`)
- **Category:** naming · **Severity:** Low · **Scope-size:** 1 mismatched export among 3 return/refund templates
- **Currency:** present — `packages/email-templates/src/index.ts:7` exports `ReturnRequested` from `./emails/refund-requested`; **no `return-requested.tsx` file exists** (templates present: `refund-issued.tsx`, `refund-requested.tsx`, `return-refunded.tsx`). Line 6 (`ReturnRefunded` ← `return-refunded`) is correct.
- **Affected:** `sitehaus-commerce:packages/email-templates/src/index.ts:7`, `packages/email-templates/src/emails/refund-requested.tsx`, `apps/worker/src/processors/handlers/return-requested.handler.ts`
- **Why it matters:** The `ReturnRequested` symbol (a *return*-requested email) resolves to a `refund-requested.tsx` file (a *refund*-requested email) — return ≠ refund. The worker's `handleReturnRequested` renders whatever `ReturnRequested` points at, so a "return requested" event may send refund-worded copy. Easy to wire the wrong template; fragile naming.
- **Deepened instances:** No other export/file mismatch in the barrel; `refund-issued.tsx` is exported elsewhere correctly. Verify the worker's intended copy for the return-requested event before renaming.
- **Recommended remediation:** Decide the intended template; either rename `refund-requested.tsx` → `return-requested.tsx` (and fix the export) or repoint `ReturnRequested` to the correct file. WS3-fixable (mechanical, single package).
- **Effort:** S · **Regression risk:** Low (verify the rendered email first) · **Disposition:** WS3-fixable.

### F-012 · Filename typo `shipping.shemas.ts`
- **Category:** naming · **Severity:** Low · **Scope-size:** 1 file + **1 importer**
- **Currency:** present — `packages/validation/src/shipping.shemas.ts` (missing `c`); every sibling is `*.schemas.ts`.
- **Affected:** `sitehaus-commerce:packages/validation/src/shipping.shemas.ts`, importer `packages/validation/src/index.ts:16` (`export * from "./shipping.shemas.js"`)
- **Why it matters:** Cosmetic inconsistency, but trivially fixable; the rename touches exactly 2 places (the file + the one barrel re-export — confirmed the *only* importer).
- **Recommended remediation:** `git mv shipping.shemas.ts shipping.schemas.ts` + update the one `index.ts` line. WS3-fixable.
- **Effort:** S · **Regression risk:** Low (single importer) · **Disposition:** WS3-fixable.

### F-019 · Styling-token drift in the forked storefront auth pages
- **Category:** standards · **Severity:** Low · **Scope-size:** login + callback pages across camo/naya
- **Currency:** present — camo login uses **theme tokens** (`bg-primary`, `font-heading`, `text-primary`, `text-muted-foreground`); naya login uses **raw Tailwind** (`bg-black`, `text-black`). Confirmed at HEAD.
- **Affected:** `camo-web:src/app/{login,callback}/page.tsx`, `nayadnara:src/app/{login,callback}/page.tsx`
- **Why it matters:** Same component, two un-reconciled styling conventions — confirms F-018's "fork that drifts," and means the `@sitehaus/storefront-kit` extraction (WS4) must **abstract theming out** (tokens, not hardcoded colors) so each site themes the shared auth pages.
- **Recommended remediation:** Not a standalone fix — folds into the WS4 storefront-kit design as a theming requirement. Tag → WS4.
- **Effort:** — (WS4) · **Disposition:** → **WS4** · **Related:** F-018, F-008.

### Sweep C assurances
- ✓ **F-009 is a true positive** — 18 contract-bound controllers confirm the commerce side enforces its contracts; this is the reference pattern for F-002, not a defect.
- ✓ **F-012 rename is low-risk** — the typo'd module has exactly one importer (the package barrel), so the rename cannot silently break a distant consumer.

## Sweep D — Dead code

> Each deletion recommendation is backed by a proof-of-no-references grep (recorded below).

### F-006 · Dead `mfa: 'complete'` literal in `AccessPayload`
- **Category:** dead-code · **Severity:** Low · **Scope-size:** 1 unused type-union member (2 declarations)
- **Currency:** present — `mfa?: 'pending' | 'complete'` at `access.guard.ts:22` and `:31`; **zero runtime comparison** to `'complete'` anywhere in `apps/api/src` (grep `mfa === 'complete'` → none).
- **Affected:** `sitehaus:apps/api/src/auth/access/access.guard.ts:22,31`
- **Why it matters:** Pure dead code. Full tokens are minted with `mfa` undefined and `MfaGuard`/`introspect` only branch on `'pending'` — **WS2 S2 assurance already proved `'complete'` has no auth-relevant effect** (a forged `mfa:'complete'` still needs a valid signature and is treated as "no mfa"). The literal is misleading (implies a state that never exists).
- **Recommended remediation:** Drop `'complete'` from the union (`mfa?: 'pending'`). Trivial; cross-reference WS2 S2 assurance.
- **Effort:** S · **Regression risk:** Low · **Disposition:** WS3-fixable.
- **Related:** WS2 F-006 ruling (S2 assurances).

### F-017 · `/design` showcase page shipped into the authenticated bundle
- **Category:** dead-code · **Severity:** Low · **Scope-size:** 1 route (411 lines — also the F-015 fattest page)
- **Currency:** present — `app/(dashboard)/design/page.tsx` is **not** in `components/sidebar/sidebar-links.tsx` and is imported by no source file; the only references are generated `.next/` client-reference artifacts (which confirm it *is* compiled into the dashboard bundle — i.e. the finding).
- **Affected:** `sitehaus:apps/dashboard/app/(dashboard)/design/page.tsx`
- **Why it matters:** A 411-line dev-only design-token/component gallery (zero data fetching) reachable only by typing `/design`, shipped into the authed app bundle. Dead weight + minor surface.
- **Deepened instances:** No other sidebar-unlinked showcase/demo pages found under `(dashboard)`.
- **Recommended remediation:** Delete the route (or move it to a Storybook/dev-only target outside the app bundle). Removing it also clears the single largest F-015 offender.
- **Effort:** S · **Regression risk:** Low (unreferenced) · **Disposition:** WS3-fixable.
- **Related:** F-015.

### F-027 · Orphan `create_network.sh` provisioning script
- **Category:** dead-code · **Severity:** Low · **Scope-size:** 1 orphan script
- **Currency:** present — `infra/create_network.sh` creates `sitehaus-prod-network`, but **no compose/script references `sitehaus-prod-network`** (grep across `*.yml`/`*.yaml`/`*.sh` → only the script's own definition). Every compose file declares its own bridge (`sitehaus-network` / `sitehaus-commerce-network`).
- **Affected:** `sitehaus:infra/create_network.sh`
- **Why it matters:** Orphan provisioning — either a missing wire-up (compose should reference an external `sitehaus-prod-network`) or leftover. Misleads ops about the network topology.
- **Recommended remediation:** Either wire the prod compose to an `external: sitehaus-prod-network` or delete the script. (Borderline infra-workstream, but WS1 categorized it dead-code.) WS3-fixable.
- **Effort:** S · **Regression risk:** Low · **Disposition:** WS3-fixable (confirm with the infra/deploy owner first).

### Sweep D assurances
- ✓ **All three deletions are reference-proven** — F-006 (no runtime `'complete'` branch), F-017 (no sidebar link, no source import), F-027 (no compose reference to the network) each have a recorded zero-reference grep, so removal cannot silently break a consumer.
- ✓ **F-006 corroborated by WS2** — the security sweep independently verified the literal is a harmless no-op; WS3 only adds the "delete the dead union member" hygiene recommendation.
