# Ecosystem Discovery & Documentation — Design

**Date:** 2026-06-12
**Status:** Approved
**Workstream:** 1 of 5 (see Roadmap)

## Problem

The SiteHaus platform has grown across six repositories without a unified map. Features, integration patterns, and standards drift are undocumented at the ecosystem level. Client sites carry near-identical copies of commerce/auth integration code. Before any security audit, deduplication, or refactor can be planned, the platform needs a trustworthy, maintained map of what exists.

## Roadmap (context — not all in this spec)

Five sequential workstreams, each with its own spec → plan → execution cycle:

1. **Discovery + docs** — this spec.
2. **Auth security audit** — OAuth/PKCE/IAM/token introspection, seeded by this workstream's findings register.
3. **Duplication & standards audit** — formalize and quantify what discovery logged.
4. **Refactor/abstraction plan** — extraction targets (a shared storefront SDK is the leading candidate), repo boundaries, migration order.
5. **GCP migration outline** — a sketch only; depends on the post-refactor target shape.

## Scope

**In:**

- New `apps/docs` Astro Starlight app in the sitehaus monorepo.
- Tiered documentation of all features and integration patterns across: `sitehaus`, `sitehaus-commerce`, `sitehaus-cli`, `onehealthclinics`, `camo-web`, `nayadnara`.
- Migration of existing `sitehaus/docs/` content into the docs app (pointer stubs left behind).
- A findings register logging issues discovered along the way.

**Out:**

- Any production code change. Discovery is read-only; issues are logged, never fixed — including trivial one-liners.
- The auth _audit_ (workstream 2). Auth is _documented and verified_ here; vulnerabilities found incidentally are logged as findings.
- Client-facing/marketing documentation.

**Audience:** Parker, Ethan, AI tooling, and a possible near-term developer hire. Engineering docs with enough prose and "why" for onboarding, terse and cross-linked enough for AI context.

## Architecture

### Docs app

- `apps/docs` — Astro + Starlight, port **3005**, proxied as `docs.localhost` via `infra/Caddyfile.dev`.
- Wired into the Turborepo pipeline (`build`, `dev`, `check-types` as applicable).
- All content is markdown/MDX under `src/content/docs/` — readable by humans via the site and by AI tooling as plain files.

### Information architecture

```
apps/docs/src/content/docs/
├── index.mdx                  — ecosystem overview + system diagram
├── architecture/
│   ├── ecosystem-map.md       — all repos/apps/packages/ports, who-calls-what
│   ├── auth.md                — absorbed from docs/architecture/auth-flow.md, re-verified against code
│   └── deployment.md          — sitehaus-cli, Docker Compose, Caddy, prod server topology
├── domains/
│   ├── identity/              — IAM portal features, API auth modules, SDK, contracts
│   ├── agency/                — dashboard: projects, tickets, design docs, billing, etc.
│   ├── commerce/              — commerce API services, admin UI, payments, worker
│   └── client-sites/          — shared integration pattern + one short page per site
├── standards/                 — absorbed from docs/standards/ (react.md, api.md, evolution.md)
└── findings/                  — findings register
```

Decisions:

- **Single source of truth:** existing `sitehaus/docs/architecture/` and `docs/standards/` content moves into the docs app. Original paths become one-line pointer stubs. Per-app `CLAUDE.md` files stay where they are (AI context, not documentation).
- **Client sites share a pattern page:** one page documents the common storefront integration (commerce client, OAuth callback, cart, require-auth); each site gets a short quirks page. No triplicated doc sets for ~90%-identical code.
- **Tiered depth:** tier 1 = ecosystem overview/map; tier 2 = per-domain feature inventories with file references; tier 3 = deep-dives inside domain folders, added only where complexity earns it (e.g., auth flow, order lifecycle, deploy story).

## Process

**Step 0:** Scaffold the Starlight app, Caddy entry, Turborepo wiring, and migrate existing docs content — so all new content lands in its final home.

**Domain sweeps, in order:**

1. **Identity & Auth** — first: center of gravity, and workstream 2 is waiting on it.
2. **Commerce** — second: spans the most repos (sitehaus-commerce, apps/commerce, all three client sites).
3. **Agency / Dashboard**
4. **Client Sites**
5. **Infra / Deploy**

Each sweep:

- Read the actual code — contracts, controllers, schema, routes, components — not just existing CLAUDE.md claims.
- Write the domain's tier-2 inventory pages with file references.
- Update the ecosystem map's who-calls-what section.
- Log findings as encountered.
- Announce completion for async review by Parker/Ethan; no hard gate before the next domain starts.

## Findings register

A single page, `findings/index.md`, holds all entries as one table grouped by category. Every issue gets a row:

- **ID:** stable, sequential (`F-001`, `F-002`, …) — later workstreams reference these directly.
- **Category:** `duplication` | `standards` | `auth` | `dead-code` | `other`
- **Severity:** `high` | `medium` | `low`
- **Repos + file references**
- **One-line note** — descriptive, no fixes, no extended editorializing.

## Success criteria

1. `apps/docs` builds in the Turborepo pipeline and serves at `docs.localhost`.
2. Every app and package across all six repos appears in the ecosystem map.
3. Tier-2 inventory pages exist for all five domains.
4. The auth-flow documentation has been verified line-by-line against the code; discrepancies logged as findings.
5. Existing `sitehaus/docs/` content migrated, pointer stubs in place.
6. Findings register populated; zero production code changed.

## Error handling / risks

- **Docs drift:** mitigated by docs living in the monorepo next to code, and by the refactor workstream treating doc updates as part of its definition of done.
- **Scope creep into fixing:** explicitly prohibited; the findings register is the only outlet.
- **Stale claims in existing docs/CLAUDE.md:** all absorbed content is verified against code, not copied on trust.

## Testing

- `pnpm build --filter=docs` passes.
- Starlight's built-in link validation passes (broken internal links fail the build).
- Manual: site renders at `docs.localhost`, sidebar matches the IA above.
