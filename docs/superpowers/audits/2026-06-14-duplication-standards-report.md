# SiteHaus Duplication & Standards Audit — Findings Report

Workstream 3. Committable (code-quality, not exploit detail). Continues the F-### register; net-new at F-059+.
Spec: `docs/superpowers/specs/2026-06-14-duplication-standards-audit-design.md` · Plan: `docs/superpowers/plans/2026-06-14-duplication-standards-audit.md`

_Executive summary added in synthesis (Task 5)._

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

## Sweep C — Standards & naming: commerce + storefronts

## Sweep D — Dead code
