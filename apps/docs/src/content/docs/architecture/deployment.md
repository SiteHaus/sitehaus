---
title: Infrastructure & Deployment
description: How the SiteHaus platform and commerce stacks are built, shipped, and operated — Docker Compose, GitHub Actions CD, Caddy, and the sitehaus-cli ops tool.
---

## Overview

There are **two deployable server stacks**, each a single host running Docker
Compose behind Caddy:

- **Platform** (`sitehaus`) — web, dashboard, iam, commerce admin, api, plus
  Postgres + Redis + Caddy.
- **Ecom** (`sitehaus-commerce`) — gateway, commerce, payments, worker, plus
  Postgres + Redis + Caddy.

Each stack has a **staging** and a **production** host (Vultr VMs, `deploy` SSH
user). Images are built by GitHub Actions, pushed to **GHCR**
(`ghcr.io/sitehaus/…`), and pulled onto the hosts. Client sites
(`camo-web`, `nayadnara`, `onehealthclinics`) are **not** part of this — they
deploy independently on Vercel (see [Client Sites](/domains/client-sites/)).

Day-to-day operation is driven by the Rust **`sitehaus` CLI**
([sitehaus-cli](#the-sitehaus-cli)), which SSHes into a host and wraps Docker
Compose.

## Stacks & images

| Stack    | Repo                | Compose files (committed)                          | Services |
| -------- | ------------------- | -------------------------------------------------- | -------- |
| Platform | `sitehaus`          | `docker-compose.dev.yml`, `.staging.yml`, `.prod.yml` | postgres, redis, web, dashboard, iam, commerce, api, caddy |
| Ecom     | `sitehaus-commerce` | `docker-compose.dev.yml`, `.prod.yml`              | postgres, redis, gateway, commerce, payments, worker, caddy |

> Note the asymmetry: the platform repo has a dedicated `docker-compose.staging.yml`,
> but the commerce repo has **no** staging compose — its staging server runs
> `docker-compose.prod.yml` with `IMAGE_TAG=staging`. This drift surfaces in
> several places below (the CLI, the Caddyfile, and the CD pipeline).

### Image naming

| Stack    | Image prefix                              | Apps imaged |
| -------- | ----------------------------------------- | ----------- |
| Platform | `ghcr.io/sitehaus/sitehaus-<app>`         | web, dashboard, iam, commerce, api |
| Ecom     | `ghcr.io/sitehaus/sitehaus-commerce-<app>`| gateway, commerce, payments, worker |

Postgres (`postgres:17-alpine`), Redis (`redis:7-alpine`), and Caddy
(`caddy:2-alpine`, except platform prod which pins `caddy:2.10.0-alpine`) are
stock upstream images.

Each app has its own `Dockerfile` (`apps/<app>/Dockerfile`); the platform repo
additionally has a root `Dockerfile` and a shared `infra/docker/_next.dockerfile`
for the Next.js apps. The Next.js apps bake `NEXT_PUBLIC_*` values at **build
time** via Docker build-args (per-environment — staging vs production point at
different API URLs), so a given image is environment-specific.

## CI

| | Platform (`sitehaus`) | Ecom (`sitehaus-commerce`) |
| --- | --- | --- |
| Trigger | PR → `main` | PR → `main`, push → `ci/staging` |
| Path filters | skips `**/*.md`, `docs/**` | also skips `docker-compose*.yml`, `infra/**`, `.github/workflows/cd.yml` |
| Steps | `turbo run check-types lint build` | `pnpm test` → `pnpm lint` → `turbo run check-types build` |
| **Tests run?** | **No** | **Yes** |

Both cache Turborepo against `pnpm-lock.yaml`, use Node 20 + pnpm, and
`pnpm install --frozen-lockfile`. The platform CI runs **no test step**
(Findings F-024).

The platform repo has two extra workflows:

- **`publish-client-sdk.yml`** — on a `client-sdk-v*` git tag, builds and
  `npm publish --access public --provenance`es `packages/client-sdk`, after a
  guard that the tag version matches `package.json`. This is the npm package the
  commerce gateway consumes and the client sites vendor (see F-020 for the
  distribution skew).
- **`discord_notify.yml`** — posts push/PR embeds to a Discord webhook on every
  branch. The commerce repo has no equivalent.

## CD pipeline

Both repos' `cd.yml` fire on **push to `main`** and run the same five-stage
pipeline:

```
build-staging → deploy-staging → await-approval → build-production → deploy-production
```

1. **build-staging** — matrix-builds each app image, pushes
   `:staging` + `:staging-<sha>` to GHCR (GHA layer cache).
2. **deploy-staging** — `appleboy/ssh-action` into the staging host: sync repo,
   `docker compose pull`, `up -d --remove-orphans`, `docker image prune -f`.
3. **await-approval** — a job pinned to the `staging` GitHub Environment; this is
   the **manual approval gate** before production (configure required reviewers
   on that environment).
4. **build-production** — same matrix, pushes `:latest` + `:<sha>`.
5. **deploy-production** — SSH into the production host, pull `:latest`, recreate.

Differences worth knowing (they bite during incidents):

| | Platform prod deploy | Ecom prod deploy |
| --- | --- | --- |
| Repo sync | `git pull origin main` | `git pull origin main` |
| Compose | `docker-compose.prod.yml` | `docker-compose.prod.yml` |
| Recreate | `up -d --remove-orphans` | `up -d --remove-orphans --force-recreate` |
| Caddy | explicit `restart caddy` after `up` | none |
| Image tag | hardcoded `:latest` in compose | `${IMAGE_TAG:-latest}` (prod deploy leaves it unset → `latest`) |

Staging deploys use `git reset --hard origin/main` (idempotent); production uses
`git pull` (can fail on a diverged tree). See Findings F-028.

### Rollback

CD pushes an immutable `:<sha>` tag for every build, so the *images* exist to
roll back to. But:

- **Ecom** can roll back by setting `IMAGE_TAG=<sha>` and re-running compose —
  the prod compose is parameterized (`${IMAGE_TAG:-latest}`).
- **Platform** **cannot** roll back the same way — its prod compose hardcodes
  `:latest`, so there is no compose-level pin even though `:<sha>` images exist.

Both production deploys otherwise track the floating `:latest` tag. See F-022.

### Deploy secrets (GitHub)

The CD workflows reference these repo/environment secrets (names only):
`VULTR_IP`, `VULTR_STAGING_IP`, `SITEHAUS_STAGING_IP`, `VULTR_SSH_KEY`,
`SITEHAUS_STAGING_HOST_KEY`, `GITHUB_TOKEN` (GHCR), `NODE_AUTH_TOKEN` (npm),
`DISCORD_WEBHOOK`.

> Only the platform **staging** SSH step pins the host key
> (`host_public_key: SITEHAUS_STAGING_HOST_KEY`). The two production steps and
> commerce staging do **not** verify the host key, and all use
> `appleboy/ssh-action@master` (a moving ref). See F-023.

## Caddy & networking

Caddy terminates TLS and reverse-proxies to the app containers over the
per-stack Docker bridge network (`sitehaus-network` / `sitehaus-commerce-network`).
Routing (subdomains generalized — see the committed `infra/Caddyfile*` for the
real FQDNs):

| Domain pattern         | → container      |
| ---------------------- | ---------------- |
| `<domain>`             | `web:3000`       |
| `dashboard.<domain>`   | `dashboard:3000` |
| `iam.<domain>`         | `iam:3000`       |
| `api.<domain>`         | `api:3000`       |
| `commerce.<domain>`    | `commerce:3000`  |
| `api.commerce.<domain>`| `gateway:7020`   |

A shared `(security_headers)` snippet sets response headers. TLS uses Let's
Encrypt with a hardcoded contact email in the committed Caddyfile rather than the
`CADDY_EMAIL` env var that `.env.example` advertises (F-029).

Two networking quirks:

- The commerce repo has a single `infra/Caddyfile` (no `.staging` variant) that
  declares **both** the production and staging gateway FQDNs. The staging host
  therefore loads the production hostname and will attempt to issue a cert for it
  (F-025). The platform repo does have a separate `Caddyfile.staging`.
- `infra/create_network.sh` creates a `sitehaus-prod-network`, but no compose
  service references it — the compose files declare their own bridge networks.
  Orphan script (F-027).

Postgres is only port-mapped to the host in `docker-compose.staging.yml`
(`127.0.0.1:5432`); prod compose keeps it network-internal.

## The sitehaus CLI

`sitehaus-cli` is a Rust binary (`sitehaus`, clap-based) that operates the hosts
over SSH. Config lives at `~/.sitehaus/config.yml`:

```yaml
active_server: commerce-staging
servers:
  commerce-staging:
    type: ecom            # ecom | platform
    host: <ip-or-domain>
    ssh_user: deploy
    ssh_key_path: ~/.ssh/id_ed25519
    repo_path: /srv/sitehaus-commerce
    health_url: https://…/health
    local_path: ~/Dev/sitehaus-commerce
```

A server's `type` (`ecom` vs `platform`) drives every command's container names,
compose file, and valid service list. `sitehaus setup` is an interactive wizard
that writes this config and can `ssh-copy-id` your key.

### Commands

| Command | What it does |
| ------- | ------------ |
| `server add/list/remove`, `use <name>`, `--server <name>` | manage & select the target host |
| `status` | print active server + endpoint |
| `health` | HTTP GET the `health_url` (spinner, exit 1 if not 200) |
| `ps` | `docker ps` on the host |
| `logs [service]` | stream one container's logs, or all via `compose logs -f` |
| `restart [services…]` | `compose restart`, or restart matched containers by substring |
| `deploy` | pull latest images + `up -d` (+ caddy restart on platform) — confirm-gated |
| `db seed/migrate/studio/query/provision` | DB ops inside the app container (see below) |
| `env check/set` | audit / write env vars on the host |
| `store check <slug>` | validate a store's DB→IAM→live-HTTP resolution chain (ecom only) |

Service names differ by type — ecom: `gateway, commerce, payments, worker, caddy,
postgres, redis`; platform: `api, web, dashboard, iam, commerce, caddy, postgres,
redis`.

### How ops map to the host

- **logs/restart/deploy** resolve a compose file from the server type:
  ecom → `docker-compose.prod.yml`, platform → `docker-compose.staging.yml`.
- **deploy** (ecom) pulls + `up -d --remove-orphans` + `restart caddy` +
  `image prune`; **deploy** (platform) additionally `git pull origin main`s
  first. Both are gated by a `confirm()` prompt.
- **db migrate/seed** exec into the app container and run pnpm in the live repo
  checkout (`corepack … pnpm install --frozen-lockfile && pnpm --filter
  @sitehaus-ecom/database db:migrate`, or the `@site-haus/db` equivalent on
  platform). `db studio` opens Drizzle Studio over an SSH tunnel; `db provision`
  sets up a client store (resolves the IAM client ID from a platform server).

> **Compose-file drift inside the CLI:** for a **platform** server, `logs`,
> `restart`, and `deploy` use `docker-compose.staging.yml`, but `env set`
> writes to and restarts via `docker-compose.prod.yml` (`PLATFORM_COMPOSE`).
> Same host, two compose files (F-026).

### Safety rails

- `confirm()` — y/N prompt (default No) before `deploy`, `seed`, `migrate`,
  `env set`.
- `confirm_prod()` — if the server name contains `prod`, requires the operator to
  **type the server name exactly** before destructive DB ops (`seed`, `migrate`).
- `env check` runs **advisory validations** against the live container env:
  `check_no_localhost` (DB/Redis/IAM URLs, cookie domain), `check_secret_length`
  (≥32 chars for `JWT_SECRET` / `SESSION_SECRET`), `check_stripe_key` (warns on
  `sk_test_` on a prod server), `check_dev_redirect_in_prod` (warns if
  `EMAIL_DEV_REDIRECT` is set in prod). These read `docker exec <container> env`;
  values are masked in output.
- `env set` does update-or-append into the right per-app `.env` file (it maps
  each key to its owning service — e.g. `STRIPE_*` → payments, `R2_*` →
  commerce, `EMAIL_*` → commerce + worker, everything else → gateway), then
  `compose up -d <service>` to apply.

## Environment variables

Env files are **per-app `.env`** on the hosts (`apps/<app>/.env`), plus a
root `.env` for Postgres/Caddy. Required vars by stack (names only — see each
repo's `.env.example`):

**Platform (`apps/api/.env`):** `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`,
`COOKIE_DOMAIN`, `COOKIE_SAME_SITE`, `DASHBOARD_URL`, `IAM_APP_URL`,
`EMAIL_ENABLED`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `RESEND_API_KEY`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `R2_ACCOUNT_ID`,
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `MAX_UPLOAD_SIZE`.
Root `.env`: `POSTGRES_{USER,PASSWORD,DB}`, `CADDY_EMAIL`, plus the email/cookie
vars.

**Ecom:** gateway — `DATABASE_URL`, `REDIS_URL`, `IAM_URL`, `IAM_CLIENT_KEY`,
`SESSION_SECRET`, `COMMERCE_HOST`, `PAYMENTS_HOST`, `PORT`, `NODE_ENV`;
payments — `DATABASE_URL`, `DB_POOL_SIZE`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `NODE_ENV`; commerce/worker — `R2_*`, `EMAIL_FROM`,
`RESEND_API_KEY`, `EMAIL_DEV_REDIRECT`. Root `.env`: `POSTGRES_*`,
`SEED_CLIENT_ID`.

## See also

- [Ecosystem Map](/architecture/ecosystem-map/) — every app, package, and port.
- [Findings](/findings/) — F-022…F-029 are the infra/deploy issues from this sweep.
