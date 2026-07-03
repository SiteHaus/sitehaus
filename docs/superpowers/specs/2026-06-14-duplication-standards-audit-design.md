# Duplication & Standards Audit — Design Spec

**Workstream 3 of 5** in the SiteHaus ecosystem cleanup effort.
**Date:** 2026-06-14
**Status:** Approved-by-delegation (Parker: "feel free to rip whatever") — decisions
below were made by the orchestrator with sensible defaults and are flagged for
review; redirect any of them on return.
**Predecessor:** Workstream 1 (Discovery + docs) produced `apps/docs` and the
`F-###` register (F-001…F-029). Workstream 2 (Auth security audit) consumed
F-030…F-058 (local-only). **This audit continues the register at F-059+.**

> **Sensitivity note:** Unlike WS2, WS3 findings are **code-quality**, not exploit
> detail — duplication, standards drift, dead code. They are **safe to commit**.
> All WS3 deliverables are committed (no gitignored workspace).

---

## 1. Goal

A systematic audit of **duplication and standards-conformance debt** across the
SiteHaus TypeScript/JavaScript repos, producing a verified, sized, and prioritized
remediation runway — **without changing any production code**. WS3 turns the terse
WS1 discovery findings into an actionable, costed plan and hands the structural
extractions to WS4.

WS3 does three things WS1 did not:
1. **Verify currency** — confirm each seed finding still exists at its cited
   location (code may have moved since 2026-06-12).
2. **Deepen** — for each pattern, hunt the *unenumerated* instances the discovery
   sweep didn't list (e.g. F-014 named 10 React-Query-bypassing pages — are there
   more? F-008's triplication — is the full extraction boundary mapped?).
3. **Prioritize & size** — every finding gets an effort estimate, a regression-risk
   note, a P0/P1/P2 priority, and either a WS3-recommendation or a WS4-handoff.

## 2. Scope

**In scope — the 18 seed findings + their unenumerated siblings:**

- **Duplication (5):** F-001 (storefront auth/commerce files shared camo↔naya),
  F-008 (storefront commerce client triplicated across camo/naya/onehealthclinics),
  F-013 (admin UI re-declares `@sitehaus-ecom/contracts` by hand), F-016
  (audit-action label maps duplicated in dashboard), F-018 (nayadnara is a fork of
  camo-web). Plus F-020 (client-SDK vendored as a byte-identical tarball, dedup/
  distribution-adjacent).
- **Standards (10):** F-002 (IAM API doesn't bind ts-rest contracts, only types its
  SDK), F-003 (auth contract `client_id` vs controller `client_key` drift), F-004,
  F-009 (commerce *does* bind contracts — positive contrast), F-010 (export/file
  name mismatch), F-012 (`shipping.shemas.ts` typo), F-014 (10 dashboard pages
  fetch in `useEffect` instead of React Query), F-015 (fat `page.tsx` files,
  240–424 lines), F-019 (styling-token drift in forked auth pages), F-024.
- **Dead code (3):** F-006 (dead `mfa:'complete'` state), F-017 (`/design`
  showcase page shipped into the authed bundle), F-027.

**Repos in scope:** `sitehaus`, `sitehaus-commerce`, `camo-web`, `nayadnara`,
`onehealthclinics`.

**Out of scope:**
- `sitehaus-cli` (Rust; zero WS1 standards/dedup findings; different toolchain).
- The *design* of any shared abstraction (the `@sitehaus/storefront-kit`
  extraction, the contracts-import refactor) — that is **Workstream 4**. WS3 sizes
  and sequences these but does not architect them.
- Security findings (WS2) and infra/deploy findings (F-022/F-023, infra workstream).
- Performance, accessibility, and net-new feature work.

## 3. WS3 ⟷ WS4 boundary (the key scoping call)

The risk in WS3 is bleeding into WS4's refactor design. The line:

- **WS3 (this) — audit & plan:** "Here is *every* place the storefront commerce
  client is duplicated, here is the proposed extraction boundary (which files
  become `@sitehaus/storefront-kit`), here is the rough cost (S/M/L), the
  regression risk, and where it sits in the sequence." Read-only. No new package,
  no moved code.
- **WS4 — design & build:** the actual package API design, the migration mechanics,
  the per-site cutover. WS4 gets a **sized, sequenced target** from WS3, not a
  blank page.

For each **structural** finding (F-008, F-013, F-018, F-020), the WS3 deliverable
is a one-paragraph "extraction sketch + cost" tagged **→ WS4**. For each
**mechanical** finding (dead code, naming, per-file standards drift), WS3 gives a
direct remediation recommendation tagged **WS3-fixable** (to be executed in a later
fix workstream, still not in WS3 itself).

## 4. Audit Decomposition

Four sweeps, grouped so each is independently reviewable:

| Sweep | Theme | Seed findings |
| ----- | ----- | ------------- |
| **A** | **Cross-repo duplication & fork divergence** — the storefront triplication, the camo↔naya fork, the vendored SDK, the hand-redeclared contracts, the dashboard label maps. Map the true extent of each and the extraction boundary. | F-001, F-008, F-013, F-016, F-018, F-020 |
| **B** | **Standards conformance: `sitehaus` dashboard + IAM** — React Query usage (F-014), fat `page.tsx` (F-015), the ts-rest contract-binding gap (F-002/F-003), F-004/F-024. Audit against `apps/dashboard/CLAUDE.md` + `apps/docs` React standards. | F-002, F-003, F-004, F-014, F-015, F-024 |
| **C** | **Standards & naming: commerce + storefronts** — commerce contract binding (F-009, positive), naming (F-010, F-012), storefront styling drift (F-019). | F-009, F-010, F-012, F-019 |
| **D** | **Dead code** — confirm each is truly unreferenced (grep for imports/routes) before recommending deletion. | F-006, F-017, F-027 |

Each sweep produces, per finding: a **currency verdict** (still present? moved?
already fixed?), a **scope-size** (instances / files / LOC), the **deepened
instance list**, and a **remediation recommendation**. Net-new instances that
warrant their own ID get **F-059+**.

## 5. Methodology

Mirrors the WS1/WS2 rhythm, tuned for code-quality (no adversarial threat model):

1. **Auditor pass (per sweep)** — read-only, first-hand. For each seed finding:
   re-open the cited file, confirm/refute currency, then `grep`/read outward for
   sibling instances the discovery sweep missed. Record scope-size and a fix sketch.
2. **Verification pass (lighter than WS2)** — no adversarial disproof needed;
   instead confirm two things per finding: (a) it is *still true* at HEAD, and (b)
   the recommended fix won't break a consumer (e.g. a "dead" export really has zero
   importers; a "duplicate" is semantically identical, not a deliberate fork point).
3. **Synthesis (orchestrator)** — normalize severity, dedup across sweeps,
   cross-reference WS2 where it already ruled on a finding (F-003 ↔ WS2 F-031;
   F-006 ↔ WS2 S2 assurance), and sequence everything into the remediation plan.

**Hard constraints (verbatim from WS1/WS2):**
- **READ-ONLY** across all source repos. The only writes are the WS3 deliverables
  (report, remediation plan, register rows) — all committed, none touching
  production code.
- Issues are **logged, never fixed** (fixing is a later workstream).
- Follow the existing F-### numbering; **do not renumber** the seed findings — refine
  their register rows in place if currency changed, and add net-new at F-059+.

## 6. Finding Format

Each WS3 finding (in `report.md`) records:

`ID · title · category (duplication | standards | naming | dead-code) · severity
(High/Medium/Low) · scope-size (N instances / files) · affected repos:files ·
why-it-matters (1 line) · recommended remediation · effort (S/M/L) · disposition
(WS3-fixable | → WS4)`

Seed findings keep their original IDs (F-001…F-027); net-new siblings get F-059+.

## 7. Deliverables & Location

All committed (non-sensitive):

- **`docs/superpowers/audits/2026-06-14-duplication-standards-report.md`** — the
  four-sweep findings report (currency verdicts, deepened instance lists,
  assurances where a seed finding turned out already-fixed or a non-issue).
- **`docs/superpowers/audits/2026-06-14-duplication-standards-remediation.md`** —
  every finding sequenced into P0/P1/P2 with effort, regression risk, and the
  WS3-fixable / → WS4 disposition; a "shared-kit candidates" section that is the
  explicit WS4 handoff.
- **Public register update** — `apps/docs/src/content/docs/findings/index.md`:
  refine any seed row whose currency changed, and append net-new rows F-059+. The
  register stays the canonical terse index; the deep analysis lives in the report.
- **No docs-site IA change** — no new sidebar entry, no `astro.config.mjs` change.
  Promoting the report into a browsable docs page is an optional later step.

Commits follow the workstream convention (`--no-verify --no-gpg-sign`; Parker
re-signs at leisure).

## 8. Success Criteria

1. All 18 seed findings have a **currency verdict** (present / moved / already-fixed)
   and a **scope-size**.
2. Each pattern is **deepened** — the unenumerated sibling instances are listed
   (or an assurance that none exist).
3. Every finding has a **remediation recommendation** with effort + regression risk
   + P0/P1/P2 + a WS3-fixable / → WS4 disposition.
4. The **structural** findings (F-008/F-013/F-018/F-020) each have a one-paragraph
   extraction sketch + cost forming a coherent **WS4 handoff**.
5. WS2-overlapping findings (F-003, F-006) **cross-reference** WS2's conclusion
   rather than re-litigating.
6. **Zero production code changed.** The only committed diffs are the two WS3
   audit docs, the spec/plan, and the register-row updates.

## 9. Risks & Constraints

- **Scope creep into WS4** — mitigated by §3: structural items get a sized sketch,
  never a package design.
- **Auditing against unwritten standards** — only audit against *documented*
  standards (CLAUDE.md, `apps/docs`); an implied-but-unwritten rule is flagged as a
  "candidate standard to ratify," not scored as a violation.
- **Stale citations** — code moved since WS1; the currency-verdict step (§5.2) is
  the guard. A seed finding that's already fixed becomes an assurance, not a finding.
- **Subjective severity** — duplication/standards severity is softer than security;
  anchor it to concrete cost (drift risk × number of copies × change frequency).

## 10. Out of This Workstream (future)

- **WS4** — designing & building the shared abstractions WS3 sizes (storefront kit,
  contracts import, fork reconciliation).
- The **fix-implementation** of the WS3-fixable mechanical items (a later approved
  workstream, like the WS2 fix runway).
- Promoting the audit report into a browsable `apps/docs` page (optional).
- **WS5** — GCP migration outline (sketch only, money-gated).
