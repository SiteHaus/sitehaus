# Ecosystem Discovery & Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Astro Starlight docs app at `apps/docs` and fill it with tiered documentation of the entire SiteHaus ecosystem (6 repos) plus a findings register, via five read-only domain sweeps.

**Architecture:** New Starlight app in the sitehaus Turborepo (port 3005, `docs.localhost`). Existing `docs/` content migrates in with pointer stubs left behind. Five domain sweeps (Identity & Auth → Commerce → Agency → Client Sites → Infra) read code across all repos and produce inventory pages, ecosystem-map updates, and findings entries. **No production code is changed anywhere — the only writable areas are `apps/docs/`, pointer stubs under `docs/`, `infra/Caddyfile.dev`, `turbo.json` (if needed), and `CLAUDE.md` port tables.**

**Tech Stack:** Astro 5 + Starlight, Turborepo/pnpm, Caddy.

**Spec:** `docs/superpowers/specs/2026-06-12-ecosystem-discovery-docs-design.md`

---

## Execution context

- **Branch:** `docs/discovery`, checked out in the worktree at `/home/pillar/Dev/sitehaus-docs`. All paths below are relative to that worktree root unless absolute.
- **Sibling repos (read-only):** `/home/pillar/Dev/sitehaus-commerce`, `/home/pillar/Dev/sitehaus-cli`, `/home/pillar/Dev/onehealthclinics`, `/home/pillar/Dev/camo-web`, `/home/pillar/Dev/nayadnara`. Never write to these.
- **Hard rule from the spec:** discovery is read-only. Issues found get a row in the findings register — never a fix, even one-liners.
- After each domain sweep task, tell the user the domain is published for async review. Do not block on review.

---

### Task 0: Worktree dependencies

**Files:** none (environment setup)

- [ ] **Step 1: Install dependencies in the worktree**

Run: `cd /home/pillar/Dev/sitehaus-docs && pnpm i`
Expected: completes without errors (warnings OK).

- [ ] **Step 2: Verify the repo builds before we touch anything**

Run: `cd /home/pillar/Dev/sitehaus-docs && pnpm build --filter=web`
Expected: `web` builds successfully. (Sanity baseline only — we don't build every app.)

---

### Task 1: Scaffold the Starlight app

**Files:**
- Create: `apps/docs/package.json`
- Create: `apps/docs/astro.config.mjs`
- Create: `apps/docs/tsconfig.json`
- Create: `apps/docs/.gitignore`
- Create: `apps/docs/src/content.config.ts`
- Create: `apps/docs/src/content/docs/index.mdx`

- [ ] **Step 1: Create `apps/docs/package.json`**

```json
{
  "name": "docs",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "astro dev --port 3005",
    "build": "astro build",
    "preview": "astro preview --port 3005",
    "check-types": "astro check"
  },
  "dependencies": {
    "@astrojs/starlight": "^0.36.0",
    "astro": "^5.6.0",
    "sharp": "^0.34.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.4",
    "typescript": "5.8.2"
  }
}
```

If `pnpm i` later reports `@astrojs/starlight@^0.36.0` is incompatible with the resolved Astro version, bump the Starlight range to the latest minor shown by `pnpm view @astrojs/starlight versions --json | tail -5` and re-install. Do not downgrade Astro.

- [ ] **Step 2: Create `apps/docs/astro.config.mjs`**

```js
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://docs.sitehaus.io",
  integrations: [
    starlight({
      title: "SiteHaus Docs",
      sidebar: [
        { label: "Architecture", autogenerate: { directory: "architecture" } },
        { label: "Identity & Auth", autogenerate: { directory: "domains/identity" } },
        { label: "Agency", autogenerate: { directory: "domains/agency" } },
        { label: "Commerce", autogenerate: { directory: "domains/commerce" } },
        { label: "Client Sites", autogenerate: { directory: "domains/client-sites" } },
        { label: "Standards", autogenerate: { directory: "standards" } },
        { label: "Troubleshooting", autogenerate: { directory: "troubleshooting" } },
        { label: "Findings", autogenerate: { directory: "findings" } },
      ],
    }),
  ],
});
```

Note (corrected during execution): Starlight does NOT validate links natively; the `starlight-links-validator` plugin was added in commit 046f191 and fails the build on broken internal links — that is our link check, leave it on. `index.mdx`'s links to `/architecture/ecosystem-map/` and `/findings/` were temporarily de-linked until Task 4 creates those pages; Task 10 restores all index links.

- [ ] **Step 3: Create `apps/docs/tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "src/**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 4: Create `apps/docs/.gitignore`**

```
dist/
.astro/
node_modules/
```

- [ ] **Step 5: Create `apps/docs/src/content.config.ts`**

```ts
import { defineCollection } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
};
```

- [ ] **Step 6: Create `apps/docs/src/content/docs/index.mdx`**

```mdx
---
title: SiteHaus Platform Documentation
description: Ecosystem-wide documentation for the SiteHaus platform — six repos, one map.
---

Documentation for the entire SiteHaus ecosystem. Start with the
[ecosystem map](/architecture/ecosystem-map/) for the who-calls-what view.

## Repos covered

| Repo                 | What it is                                          |
| -------------------- | --------------------------------------------------- |
| `sitehaus`           | Core monorepo: IAM, dashboard, marketing, API, docs |
| `sitehaus-commerce`  | Multi-tenant ecommerce API (NestJS microservices)   |
| `sitehaus-cli`       | Rust CLI for managing prod/staging servers          |
| `onehealthclinics`   | Client site                                         |
| `camo-web`           | Client site (commerce storefront)                   |
| `nayadnara`          | Client site (commerce storefront)                   |

Issues discovered during documentation live in the [findings register](/findings/).
```

- [ ] **Step 7: Install and build**

Run: `cd /home/pillar/Dev/sitehaus-docs && pnpm i && pnpm build --filter=docs`
Expected: install resolves (see Step 1 note if Starlight/Astro peer conflict), `docs#build` succeeds, output in `apps/docs/dist/`. The sidebar will warn about empty autogenerate directories — that's fine until later tasks fill them; if Starlight errors (not warns) on a missing directory, create the directory with a `.gitkeep` for each sidebar entry.

- [ ] **Step 8: Verify dev server**

Run: `cd /home/pillar/Dev/sitehaus-docs/apps/docs && timeout 15 pnpm dev; true`
Expected: log line showing `http://localhost:3005/` before the timeout kills it.

- [ ] **Step 9: Commit**

```bash
cd /home/pillar/Dev/sitehaus-docs
git add apps/docs pnpm-lock.yaml
git commit -m ":sparkles: Scaffold apps/docs Starlight app"
```

---

### Task 2: Caddy + CLAUDE.md wiring

> **Execution note (2026-06-12):** `infra/Caddyfile.dev` and `CLAUDE.md` do not exist on `main` (this branch's base) — they were added on `release/commerce-flagship` and are not yet merged. Resolution: this branch carries a copy of the canonical Caddyfile plus the `docs.localhost` block (commit 8e495b4), and the same block was added (uncommitted) to the release branch's working copy at `sitehaus/infra/Caddyfile.dev` — the two files are byte-identical, so the eventual both-added merge auto-resolves with no conflict. The CLAUDE.md edits (Steps 2) are **deferred to merge time** — apply the two rows below to the release branch's CLAUDE.md when `docs/discovery` merges.

**Files:**
- Modify: `infra/Caddyfile.dev` (append after the `commerce.localhost` block)
- Modify: `CLAUDE.md` (port table + Caddy table) — **deferred, see note above**

- [ ] **Step 1: Add Caddy entry**

Append to `infra/Caddyfile.dev` after the `commerce.localhost` block (keep tab indentation used by the file):

```
docs.localhost {
	reverse_proxy localhost:3005
}
```

- [ ] **Step 2: Update `CLAUDE.md`**

In the **Local Dev Networking (Caddy)** table add the row:

```
| `docs.localhost`         | Docs site (Starlight)     | :3005 |
```

In the **Port Assignments** list add:

```
- 3005: Docs site (Starlight)
```

- [ ] **Step 3: Verify Caddy config parses**

Run: `caddy validate --config /home/pillar/Dev/sitehaus-docs/infra/Caddyfile.dev 2>&1 | tail -2`
Expected: `Valid configuration`. (If `caddy` isn't on PATH, skip — syntax matches existing blocks exactly.)

- [ ] **Step 4: Commit**

```bash
cd /home/pillar/Dev/sitehaus-docs
git add infra/Caddyfile.dev CLAUDE.md
git commit -m ":wrench: Wire docs app into Caddy and port tables"
```

---

### Task 3: Migrate existing docs with pointer stubs

> **Execution note (2026-06-12):** none of the source docs exist on `main` (this branch's base) — they all live on `release/commerce-flagship`. Source each file's content with `git show release/commerce-flagship:docs/<path>`. **Step 2 (pointer stubs) is deferred to merge time**: when `docs/discovery` and the release branch are both on `main`, replace the six originals with stubs in one follow-up commit. This branch must not create `docs/architecture|standards|troubleshooting|clients` paths at all.

**Files:**
- Create: `apps/docs/src/content/docs/architecture/auth.md` (from `docs/architecture/auth-flow.md`)
- Create: `apps/docs/src/content/docs/standards/api.md`, `standards/evolution.md`, `standards/react.md` (from `docs/standards/`)
- Create: `apps/docs/src/content/docs/troubleshooting/oauth-login-issues.md` (from `docs/troubleshooting/`)
- Create: `apps/docs/src/content/docs/domains/client-sites/onehealthclinics-design-document.md` (from `docs/clients/onehealthclinics/design-document.md`)
- Modify: each source file above becomes a pointer stub
- Leave alone: `docs/superpowers/**` (workflow artifacts, not platform docs)

- [ ] **Step 1: Copy each file into the docs app and add Starlight frontmatter**

For each file: copy the content, **add frontmatter, delete the original H1 line** (Starlight renders `title` as the H1). The `title` is the old H1 text. Example for `auth.md`:

```markdown
---
title: Authentication Flow
description: OAuth 2.0 Authorization Code + PKCE across IAM, API, SDK, and client apps.
---

## Overview
...rest of the original file unchanged...
```

Frontmatter titles for the rest: `API Standards` (api.md), `Evolution Standards` (evolution.md), `React Standards` (react.md), `OAuth Login Issues` (oauth-login-issues.md), `OneHealthClinics Design Document` (onehealthclinics-design-document.md). If a file's existing H1 differs from these, prefer the file's own H1 text. Do not edit the body content in this task — verification against code happens in Task 5.

- [ ] **Step 2: Replace each original with a pointer stub**

Each original file's entire content becomes (adjusting the two paths per file):

```markdown
# Moved

This document now lives in the docs app:
`apps/docs/src/content/docs/architecture/auth.md` — https://docs.localhost/architecture/auth/
```

- [ ] **Step 3: Build to verify**

Run: `cd /home/pillar/Dev/sitehaus-docs && pnpm build --filter=docs`
Expected: PASS, no broken-link errors. If internal links inside migrated docs break the build (e.g. relative links to old `docs/` paths), rewrite those links to their new docs-app URLs — that's a link fix, not a content edit.

- [ ] **Step 4: Commit**

```bash
cd /home/pillar/Dev/sitehaus-docs
git add apps/docs docs/architecture docs/standards docs/troubleshooting docs/clients
git commit -m ":truck: Migrate existing docs into apps/docs with pointer stubs"
```

---

### Task 4: Findings register + ecosystem map skeletons

**Files:**
- Create: `apps/docs/src/content/docs/findings/index.md`
- Create: `apps/docs/src/content/docs/architecture/ecosystem-map.md`

- [ ] **Step 1: Create `findings/index.md`**

```markdown
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
| F-001 | —        | —        | —     | —     | _first finding goes here_ |
```

(The F-001 placeholder row is replaced by the first real finding in Task 5 — never renumber existing IDs after that.)

- [ ] **Step 2: Create `architecture/ecosystem-map.md`**

```markdown
---
title: Ecosystem Map
description: Every repo, app, package, and port in the SiteHaus platform, and who calls what.
---

## Repos

| Repo                | Location (dev)               | Stack                          |
| ------------------- | ---------------------------- | ------------------------------ |
| sitehaus            | `~/Dev/sitehaus`             | Turborepo, Next.js 15, NestJS 11, Drizzle/Postgres |
| sitehaus-commerce   | `~/Dev/sitehaus-commerce`    | Turborepo, NestJS 11 microservices, Drizzle/Postgres, BullMQ/Redis, Stripe Connect, R2 |
| sitehaus-cli        | `~/Dev/sitehaus-cli`         | Rust, SSH + Docker Compose ops |
| onehealthclinics    | `~/Dev/onehealthclinics`     | Next.js client site            |
| camo-web            | `~/Dev/camo-web`             | Next.js client site + commerce storefront |
| nayadnara           | `~/Dev/nayadnara`            | Next.js client site + commerce storefront |

## Apps & ports

| App / service        | Repo              | Port  | Local domain               |
| -------------------- | ----------------- | ----- | -------------------------- |
| web (marketing)      | sitehaus          | 3000  | `sitehaus.localhost`       |
| dashboard            | sitehaus          | 3001  | `dashboard.localhost`      |
| iam                  | sitehaus          | 3002  | `iam.localhost`            |
| api (NestJS)         | sitehaus          | 3003  | `api.localhost`            |
| commerce (admin UI)  | sitehaus          | 3004  | `commerce.localhost`       |
| docs                 | sitehaus          | 3005  | `docs.localhost`           |
| gateway (HTTP)       | sitehaus-commerce | 7020  | `commerce-api.localhost`   |
| commerce (TCP)       | sitehaus-commerce | 7021  | internal only              |
| payments (TCP)       | sitehaus-commerce | 7022  | internal only              |
| worker (BullMQ)      | sitehaus-commerce | —     | internal only              |
| email preview        | sitehaus          | 6969  | —                          |

## Who calls what

_Filled in domain-by-domain during the discovery sweeps (Tasks 6–10)._

## Packages

_Filled in domain-by-domain during the discovery sweeps (Tasks 6–10)._
```

- [ ] **Step 3: Build to verify**

Run: `cd /home/pillar/Dev/sitehaus-docs && pnpm build --filter=docs`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd /home/pillar/Dev/sitehaus-docs
git add apps/docs
git commit -m ":memo: Findings register and ecosystem map skeletons"
```

---

## Domain sweep tasks (Tasks 5–9 shared rules)

Every sweep task follows the same contract:

1. **Read the listed code first-hand.** Existing CLAUDE.md / docs claims are hypotheses to verify, not sources to copy.
2. **Inventory pages use this template** (one per page; `<Domain>` varies):

```markdown
---
title: <Domain> — Feature Inventory
description: <one line>
---

## Overview

<3–6 sentences: what this domain is, which repos implement it>

## Features

| Feature | Where (repo + path) | Status | Key files |
| ------- | ------------------- | ------ | --------- |

Status values: `live` | `partial` | `stale?` (looks unused/abandoned — log a finding too)

## Integration points

<bullets: each cross-repo or cross-app call, with caller file → callee endpoint/module>

## Notes for deep-dives

<bullets: anything that earns a tier-3 page later; link if/when written>
```

3. **Findings**: append rows to `findings/index.md` as discovered, continuing the ID sequence. File references use `repo:path/to/file.ts:line` form.
4. **Ecosystem map**: add this domain's arrows to the "Who calls what" section (format: `caller → callee — what travels`, e.g. `dashboard → api /auth/token — code exchange`) and its packages to "Packages".
5. **Read-only**: no source file outside `apps/docs/src/content/docs/` changes in sweep tasks.
6. **Each sweep ends with:** build (`pnpm build --filter=docs`, expect PASS), commit, and a message to the user that the domain is up for async review.

---

### Task 5: Sweep 1 — Identity & Auth

**Files:**
- Create: `apps/docs/src/content/docs/domains/identity/index.md` (inventory, template above)
- Create: `apps/docs/src/content/docs/domains/identity/api-surface.md` (every auth-related endpoint group from the contracts)
- Modify: `apps/docs/src/content/docs/architecture/auth.md` (line-by-line verification — spec success criterion 4)
- Modify: `apps/docs/src/content/docs/architecture/ecosystem-map.md`, `findings/index.md`

- [ ] **Step 1: Read the IAM/auth code**

In `sitehaus` (worktree): `apps/api/src/auth/` (all of it — oauth, session, token, totp, guards, cookie), `apps/iam/app/`, `packages/contracts/src/`, `packages/sdk/src/` (oauth.ts, fetcher.ts, http.ts, refresh.ts, run-single-refresh.ts), `packages/stores/src/auth-store.ts`, `packages/db/src/` iam schema.
In `sitehaus-commerce`: `packages/auth/` (the introspection guard).
In each client site: the auth files — `camo-web/src/app/{login,callback}/`, `camo-web/src/components/ui/require-auth.tsx`, same paths in `nayadnara`, and whatever `onehealthclinics/middleware.ts` + `lib/` do for auth.

- [ ] **Step 2: Write `domains/identity/index.md`** — every feature: login, register, email verification, 2FA/TOTP + backup codes, sessions, devices, roles/permissions, invites, OAuth clients/consent, audit logs. One row each, with status and key files.

- [ ] **Step 3: Write `domains/identity/api-surface.md`** — table of contract route groups (auth, devices, roles, sessions, password, invites, clients) → endpoints → guards applied. Source from `packages/contracts/src/` + controller decorators, not from memory.

- [ ] **Step 4: Verify `architecture/auth.md` against the code** — walk every claim (flow steps, TTLs, claim names, guard order, cookie flags, reuse-detection behavior) against the files read in Step 1. Fix the doc where it's wrong; log a finding when the *code* is what looks wrong.

- [ ] **Step 5: Findings + ecosystem map** — log everything spotted (e.g. token-introspection patterns, client-site auth duplication); add auth arrows to Who-calls-what (every app → `api.localhost` auth endpoints, commerce gateway → IAM introspection) and packages (`@site-haus/sdk`, `@site-haus/contracts`, `@site-haus/stores`, commerce `packages/auth`, `@sitehaus/client-sdk` — note where that one lives/is published from, it's referenced by sitehaus-commerce but its source repo must be confirmed in Step 1).

- [ ] **Step 6: Build, commit, announce**

```bash
cd /home/pillar/Dev/sitehaus-docs && pnpm build --filter=docs
git add apps/docs && git commit -m ":memo: Identity & Auth domain docs (sweep 1/5)"
```
Then tell the user sweep 1 is up for review.

---

### Task 6: Sweep 2 — Commerce

**Files:**
- Create: `apps/docs/src/content/docs/domains/commerce/index.md` (inventory)
- Create: `apps/docs/src/content/docs/domains/commerce/services.md` (gateway/commerce/payments/worker responsibilities + TCP message patterns)
- Create: `apps/docs/src/content/docs/domains/commerce/admin-ui.md` (sitehaus `apps/commerce` feature inventory)
- Modify: ecosystem-map, findings

- [ ] **Step 1: Read the commerce code** — `sitehaus-commerce`: `apps/gateway/src/`, `apps/commerce/src/`, `apps/payments/src/`, `apps/worker/src/`, `packages/{contracts,database,validation,auth}/src/`. `sitehaus`: `apps/commerce/app/` (admin UI — products, collections, inventory, orders, shipping, webhooks, analytics, settings). Client storefront callers: `camo-web/src/lib/commerce.ts`, `nayadnara/src/lib/commerce.ts`, `onehealthclinics/lib/ecom/`.

- [ ] **Step 2: Write `domains/commerce/index.md`** — features across catalog, cart, orders, stock/inventory, fulfillment, Stripe Connect/Tax, refunds, webhooks, R2 uploads, emails, background jobs.

- [ ] **Step 3: Write `domains/commerce/services.md`** — per service: responsibility, port, message patterns handled (from `packages/contracts`), DB tables touched, queues consumed/produced.

- [ ] **Step 4: Write `domains/commerce/admin-ui.md`** — page-by-page inventory of `sitehaus/apps/commerce`, noting which gateway endpoints each page hits.

- [ ] **Step 5: Findings + ecosystem map** — expected high-value findings: the storefront client triplication (`camo-web` vs `nayadnara` vs `onehealthclinics/lib/ecom` — log concrete file pairs); arrows: admin UI → gateway, storefronts → gateway, gateway → TCP services, payments → Stripe, worker → Resend/R2.

- [ ] **Step 6: Build, commit (`":memo: Commerce domain docs (sweep 2/5)"`), announce.**

---

### Task 7: Sweep 3 — Agency / Dashboard

**Files:**
- Create: `apps/docs/src/content/docs/domains/agency/index.md` (inventory)
- Modify: ecosystem-map, findings

- [ ] **Step 1: Read** — `sitehaus`: `apps/dashboard/app/` (all routes: projects, tickets, design docs, assets, milestones, billing, clients, audit-logs, settings, profile, design), `apps/dashboard/lib/`, `packages/db/src/` core schema, plus whichever `apps/api/src/` modules serve dashboard data (identified by following the dashboard's data-fetching hooks). Cross-check against the scope doc in project memory (`dashboard-scope.md`) for intended-vs-built deltas — deltas are inventory `Status` values, not findings.

- [ ] **Step 2: Write `domains/agency/index.md`** — features with status (`live`/`partial`/`stale?`), including role-based view split (client vs employee).

- [ ] **Step 3: Findings + ecosystem map** — log standards drift against `standards/react.md` (thin pages, one-component-per-file, React Query usage) where seen; arrows: dashboard → api modules.

- [ ] **Step 4: Build, commit (`":memo: Agency domain docs (sweep 3/5)"`), announce.**

---

### Task 8: Sweep 4 — Client Sites

**Files:**
- Create: `apps/docs/src/content/docs/domains/client-sites/index.md` (the shared integration pattern — auth + storefront)
- Create: `apps/docs/src/content/docs/domains/client-sites/onehealthclinics.md`, `camo-web.md`, `nayadnara.md` (short quirks pages)
- Modify: ecosystem-map, findings

- [ ] **Step 1: Read** — each site's `src/` (or `app/`+`lib/` for onehealthclinics) end to end; they're small. Diff the shared files concretely: `diff camo-web/src/lib/commerce.ts nayadnara/src/lib/commerce.ts` (and types, callback, require-auth, cart components) to quantify how identical they are.

- [ ] **Step 2: Write `index.md` (pattern page)** — the canonical integration: env vars, OAuth login/callback wiring, commerce client, cart flow, deploy target (note `camo-web` has `.vercel/` + `vercel.json` — confirm each site's actual hosting).

- [ ] **Step 3: Write the three quirks pages** — per site: what it sells/does, deltas from the pattern page, anything site-specific (e.g. onehealthclinics `middleware.ts`, its Search-Console zip suggests SEO attention).

- [ ] **Step 4: Findings + ecosystem map** — duplication findings with diff stats per file pair; arrows: each site → commerce gateway + IAM.

- [ ] **Step 5: Build, commit (`":memo: Client sites domain docs (sweep 4/5)"`), announce.**

---

### Task 9: Sweep 5 — Infra / Deploy

**Files:**
- Create: `apps/docs/src/content/docs/architecture/deployment.md`
- Modify: ecosystem-map (final pass on Packages + Who-calls-what), findings

- [ ] **Step 1: Read** — `sitehaus-cli/src/` (every command), `sitehaus-cli/CLAUDE.md` + `~/.sitehaus/config.yml` shape (document the schema, do not paste real hosts/secrets into docs), `sitehaus/docker-compose*.yml`, `sitehaus/infra/`, `sitehaus-commerce/docker-compose*.yml` + `sitehaus-commerce/infra/`, both repos' `.github/workflows/`.

- [ ] **Step 2: Write `architecture/deployment.md`** — local dev topology (Caddy table), prod/staging topology as the CLI reveals it (servers, compose stacks, how deploys run), CI/CD per repo, env-var inventory pointers (`.env.example` files — names only, never values).

- [ ] **Step 3: Final ecosystem-map pass** — every package across all repos now listed under Packages with one-line purpose; Who-calls-what complete. Verify spec success criterion 2 (every app and package appears) by listing `apps/*` and `packages/*` in the three monorepos and checking each against the map.

- [ ] **Step 4: Findings** — anything infra-ish (secrets in repos, drift between dev/prod compose files, unpinned images).

- [ ] **Step 5: Build, commit (`":memo: Infra & deploy docs (sweep 5/5)"`), announce.**

---

### Task 10: Closeout against spec success criteria

**Files:**
- Modify: `apps/docs/src/content/docs/index.mdx` (link all finished sections)
- Possibly modify: any page failing the checks below

- [ ] **Step 1: Walk the six success criteria** from the spec (build passes; every app/package mapped; five domain inventories exist — note criterion says five domains: identity, commerce, agency, client-sites count as four content dirs + infra lives under architecture/deployment.md, which satisfies the spec's "Infra/Deploy" domain; auth doc verified; old docs stubbed; findings populated + zero production code changed). For the last one run:

```bash
cd /home/pillar/Dev/sitehaus-docs && git diff main --stat -- . ':!apps/docs' ':!docs' ':!infra/Caddyfile.dev' ':!CLAUDE.md' ':!pnpm-lock.yaml'
```
Expected: empty output.

- [ ] **Step 2: Update `index.mdx`** with links to every section now that they exist.

- [ ] **Step 3: Final build + commit (`":memo: Discovery closeout — index links and criteria check"`).**

- [ ] **Step 4: Tell the user** discovery is complete: docs site contents, findings count by category/severity, and that workstream 2 (auth security audit) is ready to brainstorm seeded by the `auth`-category findings.
