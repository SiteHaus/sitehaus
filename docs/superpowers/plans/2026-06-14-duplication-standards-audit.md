# Duplication & Standards Audit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify, deepen, size, and prioritize the duplication/standards/dead-code debt across the SiteHaus TS/JS repos into two committed audit docs + register updates, changing zero production code.

**Architecture:** Four read-only audit sweeps (A–D) over the 18 WS1 seed findings (+ F-020). Each sweep re-opens every cited file to confirm currency, greps outward for unenumerated sibling instances, sizes the debt, and drafts a remediation recommendation. The orchestrator then normalizes, cross-references WS2, and sequences everything into a P0/P1/P2 remediation plan with WS3-fixable / → WS4 dispositions. All output is committed (non-sensitive).

**Tech Stack:** Targets `sitehaus` (Next.js dashboard/IAM + NestJS API + packages), `sitehaus-commerce` (NestJS gateway/services), and the storefronts `camo-web` / `nayadnara` / `onehealthclinics`. Audit artifacts are plain Markdown under `docs/superpowers/audits/`.

**Spec:** `docs/superpowers/specs/2026-06-14-duplication-standards-audit-design.md`

---

## Hard constraints (apply to EVERY task)

- **READ-ONLY across all source repos.** The only files written are the two WS3 audit docs under `docs/superpowers/audits/`, the public register rows in `apps/docs/src/content/docs/findings/index.md`, and this plan/spec — all committed; **no production code changes**.
- **Issues are logged, never fixed** (fixing is a later workstream).
- **Do NOT renumber seed findings.** F-001…F-027 keep their IDs; refine their register rows only if currency changed; net-new sibling instances get **F-059+** (WS2 consumed through F-058).
- **Audit only against documented standards** (root + per-app `CLAUDE.md`, `apps/docs` standards). An implied-but-unwritten rule is a "candidate standard to ratify," not a scored violation.
- Source repos: `~/Dev/sitehaus`, `~/Dev/sitehaus-commerce`, `~/Dev/camo-web`, `~/Dev/nayadnara`, `~/Dev/onehealthclinics`.

## Finding format (used in `report.md` for every finding)

```
### F-0XX · <title>
- **Category:** duplication | standards | naming | dead-code
- **Severity:** High | Medium | Low
- **Scope-size:** <N instances / files / ~LOC>
- **Currency:** present | moved (→ new path) | already-fixed (→ assurance)
- **Affected:** `repo:path/to/file.ts:line`, …
- **Why it matters:** <one line — drift risk × copies × change frequency>
- **Deepened instances:** <sibling instances the WS1 sweep didn't list, or "none found">
- **Recommended remediation:** <concrete approach>
- **Effort:** S | M | L · **Regression risk:** Low | Medium | High
- **Disposition:** WS3-fixable | → WS4 (extraction sketch + cost)
```

Assurances are recorded per sweep as: `✓ Checked <seed finding> — already fixed / non-issue because <reason>`.

---

### Task 0: Scaffold the audit workspace

**Files:**
- Record baseline (no file).
- Create: `docs/superpowers/audits/2026-06-14-duplication-standards-report.md`, `docs/superpowers/audits/2026-06-14-duplication-standards-remediation.md`

- [ ] **Step 0: Record the pre-audit baseline commit**

Run: `cd ~/Dev/sitehaus && git rev-parse HEAD` and note the SHA as `BASELINE` — Task 9's zero-production-change check diffs against it.

- [ ] **Step 1: Create the report skeleton**

`docs/superpowers/audits/2026-06-14-duplication-standards-report.md`:
```markdown
# SiteHaus Duplication & Standards Audit — Findings Report
Workstream 3. Committable (code-quality, not exploit detail). Continues the F-### register; net-new at F-059+.
Spec: docs/superpowers/specs/2026-06-14-duplication-standards-audit-design.md

_Executive summary added in synthesis (Task 5)._

## Sweep A — Cross-repo duplication & fork divergence
## Sweep B — Standards conformance: sitehaus dashboard + IAM
## Sweep C — Standards & naming: commerce + storefronts
## Sweep D — Dead code
```

- [ ] **Step 2: Create the remediation skeleton**

`docs/superpowers/audits/2026-06-14-duplication-standards-remediation.md` with a single `# SiteHaus Duplication & Standards Audit — Remediation Plan` heading (filled in Task 8).

- [ ] **Step 3: Commit the skeletons**

```bash
cd ~/Dev/sitehaus && git add docs/superpowers/audits/
git commit --no-verify --no-gpg-sign -m ":memo: Scaffold WS3 duplication/standards audit workspace"
```

---

### Task 1: Sweep A — Cross-repo duplication & fork divergence

**Auditor reading list (read-only, first-hand):**
- F-001 / F-008 / F-018: `camo-web:src/lib/commerce.ts`, `src/types/commerce.ts`, `src/app/{login,callback}/page.tsx`, `src/lib/cart-store.ts`, `src/components/require-auth.tsx`, `src/app/providers.tsx`; the same paths in `nayadnara:src/`; `onehealthclinics:lib/ecom/client.ts` + its callback/cart equivalents.
- F-013: `sitehaus:apps/commerce/lib/commerce.ts` vs `sitehaus-commerce:packages/contracts/src/`.
- F-016: `sitehaus:apps/dashboard/app/(dashboard)/tickets/[ticketId]/page.tsx:46`, `sitehaus:apps/dashboard/app/(dashboard)/audit-logs/_components/audit-log-view.tsx:124`.
- F-020: `camo-web:package.json` + `vendor/`, `nayadnara:package.json` + `vendor/`.

**Checklist (each seed → currency verdict + scope-size + deepened instances + remediation):**
- F-008/F-001: Which storefront commerce-client files are byte-identical vs forked? Produce the exact shared-file manifest and the per-file diff size. What is the natural extraction boundary (which files become `@sitehaus/storefront-kit`)?
- F-018: Re-confirm the fork: how many of nayadnara's `src/` files share a path with camo-web, and which deltas (nayadnara's safe-next, state-presence check, lazy QueryClient) were never back-ported?
- F-013: Count the hand-redeclared endpoint wrappers + DTO types in the :3004 admin UI; is `@sitehaus-ecom/contracts` importable there?
- F-016: Are the two audit-label maps semantically identical? Any third instance?
- F-020: Are the two vendored tarballs still byte-identical + same version? Is the SDK published to npm now?

- [ ] **Step 1: Audit each seed finding** — write results into `## Sweep A` of `report.md` using the finding format. For structural items (F-008/F-013/F-018/F-020) include the `→ WS4` extraction sketch + cost. Allocate net-new IDs from **F-059** as needed.
- [ ] **Step 2: Verify** — confirm each finding is current at HEAD and each "duplicate" is semantically identical (not a deliberate fork point); append a `Currency:` verdict to any that moved.
- [ ] **Step 3: Reconcile** — ensure every Sweep-A seed has a verdict + recommendation; add the `### Sweep A assurances` block for any seed that turned out already-fixed/non-issue. No commit yet (commit at end of task).
- [ ] **Step 4: Commit** — `git add docs/superpowers/audits/ && git commit --no-verify --no-gpg-sign -m ":memo: WS3 Sweep A — cross-repo duplication findings"`

---

### Task 2: Sweep B — Standards conformance: sitehaus dashboard + IAM

**Auditor reading list:**
- Standards source of truth: `sitehaus:apps/dashboard/CLAUDE.md`, `sitehaus:apps/api/CLAUDE.md`, `sitehaus:apps/docs/src/content/docs/` React/standards pages.
- F-014: the 10 named `page.tsx` files (projects/[projectId], projects/[projectId]/edit, clients/[clientId]/business-profile, tickets/[ticketId], tickets, projects, profile, projects/new, tickets/new, tickets/[ticketId]/edit) + their colocated `hooks/use-*.ts`.
- F-015: the fat pages (design 407, projects/[projectId]/edit 424, tickets/[ticketId] 406, projects/[projectId] 364, clients/[clientId]/business-profile 322, tickets 252, design-document 241).
- F-002/F-003: `sitehaus:apps/api/src/auth/oauth/oauth.controller.ts`, `packages/contracts/src/auth.contract.ts`, how the SDK is typed vs bound. (Cross-ref WS2 F-031.)
- F-004, F-024: re-open at their register-cited locations.

**Checklist:**
- F-014: Confirm each of the 10 still fetches in `useEffect`/`useState` (not React Query). **Deepen:** grep the dashboard for `useEffect` + `getApi(`/`fetch(` to find pages beyond the 10. Count total non-conforming pages.
- F-015: Re-measure each page's line count at HEAD; **deepen** by scanning all `page.tsx` for >100-line files with inline JSX/logic. Which have no extracted `_components/` view?
- F-002/F-003: Confirm the IAM API still doesn't bind ts-rest contracts and the `client_id`/`client_key` drift persists; cross-reference WS2's security ruling (F-031) so the standards fix and security fix are noted as the same change.
- F-004, F-024: currency verdict + scope.

- [ ] **Step 1: Audit each seed** → write `## Sweep B` (continue F-### numbering from where Sweep A left off).
- [ ] **Step 2: Verify** currency + that the cited standard is actually *documented* (quote the CLAUDE.md/standards line); downgrade to "candidate standard to ratify" if unwritten.
- [ ] **Step 3: Reconcile** + Sweep B assurances block.
- [ ] **Step 4: Commit** — `:memo: WS3 Sweep B — dashboard/IAM standards findings`

---

### Task 3: Sweep C — Standards & naming: commerce + storefronts

**Auditor reading list:**
- F-009: `sitehaus-commerce:apps/gateway/src/products/products-admin.controller.ts:11`, `packages/contracts/src/index.ts` (positive contrast — commerce *does* bind contracts).
- F-010: `sitehaus-commerce:packages/email-templates/src/index.ts:7` + the `refund-requested`/`return-refunded` templates + the worker's `return-requested.handler.ts`.
- F-012: `sitehaus-commerce:packages/validation/src/shipping.shemas.ts` (typo) + sibling `*.schemas.ts` files.
- F-019: `camo-web` vs `nayadnara` `src/app/{login,callback}/page.tsx` styling tokens.

**Checklist:**
- F-009: Confirm commerce still binds via `@TsRestHandler`; record as the positive standard the IAM API (F-002) should adopt — links Sweep B and C.
- F-010: Does `index.ts` still export `ReturnRequested` from `refund-requested`? Does the worker render the intended template? **Deepen:** any other export/file-name mismatches in that package.
- F-012: Confirm the typo'd filename; list every importer that would need updating on rename.
- F-019: Confirm the token-vs-raw-Tailwind drift; tie to F-018's "fork that drifts" (a shared kit needs theming abstracted).

- [ ] **Step 1: Audit each seed** → write `## Sweep C` (continue numbering).
- [ ] **Step 2: Verify** currency + importer lists for the rename (F-012) so regression risk is concrete.
- [ ] **Step 3: Reconcile** + Sweep C assurances block.
- [ ] **Step 4: Commit** — `:memo: WS3 Sweep C — commerce/storefront standards & naming findings`

---

### Task 4: Sweep D — Dead code

**Auditor reading list:**
- F-006: `sitehaus:apps/api/src/auth` — the `mfa:'complete'` literal in `AccessPayload`. (Cross-ref WS2 S2 assurance, which already ruled it a harmless no-op.)
- F-017: `sitehaus:apps/dashboard/app/(dashboard)/design/page.tsx` + `components/sidebar/sidebar-links.tsx`.
- F-027: re-open at its register-cited location.

**Checklist (deletion requires proof of zero references):**
- F-006: Confirm `mfa:'complete'` has zero runtime effect (WS2 verified); recommend deleting the dead literal. Disposition WS3-fixable (trivial), but note the WS2 cross-reference.
- F-017: `grep` the dashboard for any route/import/sidebar reference to `/design`; if zero, recommend removal from the authed bundle. **Deepen:** any other unreferenced showcase/demo pages.
- F-027: confirm unreferenced; list any importers.

- [ ] **Step 1: Audit each seed** → write `## Sweep D` (continue numbering). For each, run the grep that proves zero references and record the command + result.
- [ ] **Step 2: Verify** — for every "delete" recommendation, the proof-of-no-references grep is on record.
- [ ] **Step 3: Reconcile** + Sweep D assurances block.
- [ ] **Step 4: Commit** — `:memo: WS3 Sweep D — dead-code findings`

---

### Task 5: Synthesis & normalization

**Files:** finalize `report.md`.

- [ ] **Step 1: Normalize severity & scope.** Re-read all findings; apply one consistent rubric (severity anchored to drift-risk × copies × change-frequency). Confirm every finding has a category, scope-size, currency verdict, effort, and disposition.
- [ ] **Step 2: Dedup & cross-link.** Link findings that chain (F-002↔F-009 the contract-binding gap vs the positive pattern; F-018↔F-019↔F-008 the storefront fork+drift+triplication; F-003↔WS2 F-031; F-006↔WS2 S2 assurance). Add a `Related:` line where relevant.
- [ ] **Step 3: Executive summary.** At the top of `report.md`: a count table (by category, by disposition WS3-fixable vs → WS4), the highest-leverage cleanups in plain language, and confirmation each sweep has an assurance block. Replace the `_Executive summary added in synthesis (Task 5)._` placeholder.
- [ ] **Step 4: Commit** — `:memo: WS3 synthesis — exec summary, severity normalization, cross-links`

---

### Task 6: Remediation plan

**Files:** fill `docs/superpowers/audits/2026-06-14-duplication-standards-remediation.md`.

- [ ] **Step 1: Triage into P0/P1/P2.** P0 = high drift-risk / high-churn duplication or a standard whose violation actively causes bugs. P1 = medium. P2 = cosmetic/naming/dead-code. List every finding under exactly one priority.
- [ ] **Step 2: Per-finding entry.** For each: `F-### · priority · category · fix approach · affected files · effort (S/M/L) · regression risk · disposition (WS3-fixable | → WS4)`.
- [ ] **Step 3: WS4 handoff section.** A dedicated "Shared-abstraction candidates → WS4" section consolidating the extraction sketches (storefront-kit from F-008/F-001/F-018/F-019; contracts-import from F-013/F-002; SDK distribution from F-020) with their sizes — the explicit input to Workstream 4.
- [ ] **Step 4: Sequence + "if you only do three things."** Order by (leverage × ease); note dependencies (e.g. ratify the standard before mass-migrating to it). End with a three-item summary.
- [ ] **Step 5: Commit** — `:memo: WS3 remediation plan — P0/P1/P2 + WS4 handoff`

---

### Task 7: Update the public register

**Files:** Modify `apps/docs/src/content/docs/findings/index.md`.

- [ ] **Step 1: Refine moved/fixed seed rows.** For any seed finding whose currency changed (moved path, or already-fixed), update its row Note to reflect the WS3 verdict and point to the WS3 report.
- [ ] **Step 2: Append net-new rows F-059+.** Add concise rows for the net-new sibling instances surfaced during the sweeps, in the existing table format (ID | category | severity | repo | Files | Note). Keep them terse — deep analysis stays in the report.
- [ ] **Step 3: Verify the docs build.** Run: `cd ~/Dev/sitehaus/apps/docs && pnpm build 2>&1 | grep "internal links"` — expect `✓ All internal links are valid.`
- [ ] **Step 4: Commit** — `git add apps/docs/src/content/docs/findings/index.md && git commit --no-verify --no-gpg-sign -m ":memo: WS3 register update — refine seeds + net-new F-059+"`

---

### Task 8: Closeout against success criteria

- [ ] **Step 1: Walk the spec's success criteria.** Confirm: (1) all 18 seed findings have a currency verdict + scope-size; (2) each pattern deepened (sibling instances listed or "none"); (3) every finding has a remediation recommendation + effort + risk + P0/P1/P2 + disposition; (4) structural findings have an extraction sketch forming the WS4 handoff; (5) WS2-overlap findings cross-reference WS2; (6) zero production code changed.
- [ ] **Step 2: Zero-production-change check.** Run (using `BASELINE` from Task 0): `cd ~/Dev/sitehaus && git diff BASELINE HEAD --stat -- . ':!docs/superpowers' ':!apps/docs/src/content/docs/findings/index.md'` — expected: **empty** (only the audit docs + spec/plan + register changed).
- [ ] **Step 3: Report.** Summarize to Parker: finding counts by category/disposition, the highest-leverage cleanups, the WS4 handoff contents, the P0 list, and that WS4 (shared-abstraction design) or the fix-implementation workstream is the natural next step.

---

## Self-review notes (for the orchestrator)

- **No test cycle** (audit, not feature) — intentional; "tests" are the per-sweep currency/verification passes (§5.2 of the spec).
- **Spec coverage:** scope §2 → Tasks 1–4 (all 19 findings assigned: Sweep A = F-001/008/013/016/018/020; B = F-002/003/004/014/015/024; C = F-009/010/012/019; D = F-006/017/027); WS3⟷WS4 boundary §3 → the `→ WS4` disposition + Task 6 Step 3 handoff; decomposition §4 → Tasks 1–4; methodology §5 → per-task audit/verify/reconcile steps; finding format §6 → top of plan; deliverables §7 → Tasks 0,5,6,7; success criteria §8 → Task 8.
- **Numbering:** seed findings keep F-001…F-027; net-new start at **F-059** (WS2 consumed through F-058), allocated sequentially across sweeps — do not reset per sweep.
- **Commits** follow the workstream convention (`--no-verify --no-gpg-sign`); all WS3 output is committable (non-sensitive), unlike WS2.
