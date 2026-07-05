# Site Haus

<div align="left" style="display: flex; gap: 8px;">
  <a href="https://github.com/SiteHaus/sitehaus/actions/workflows/github-code-scanning/codeql">
    <img src="https://github.com/SiteHaus/sitehaus/actions/workflows/github-code-scanning/codeql/badge.svg" alt="CodeQL" />
  </a>
  <a href="https://github.com/SiteHaus/sitehaus/actions/workflows/ci.yml">
    <img src="https://github.com/SiteHaus/sitehaus/actions/workflows/ci.yml/badge.svg" alt="CI" />
  </a>
  <a href="https://github.com/SiteHaus/sitehaus/actions/workflows/cd.yml">
    <img src="https://github.com/SiteHaus/sitehaus/actions/workflows/cd.yml/badge.svg" alt="CD" />
  </a>
</div>

The SiteHaus platform: Identity and Access Management, client dashboard, commerce admin, and the Lighthaus monitoring/status system. Built with **Next.js, NestJS, Turborepo, TypeScript, Docker, and PostgreSQL**.

## Structure

The repo is organized as a [Turborepo](https://turborepo.com/docs) monorepo with pnpm workspaces.

### Apps

| App              | Description                                      | Port |
| ---------------- | ------------------------------------------------ | ---- |
| `web/`           | Marketing site                                   | 3000 |
| `dashboard/`     | Client and developer dashboard                   | 3001 |
| `iam/`           | Identity Management Portal                       | 3002 |
| `api/`           | NestJS backend API (IAM + dashboard)             | 3003 |
| `commerce/`      | Commerce store-admin UI                          | 3004 |
| `docs/`          | Internal docs (Astro Starlight, local-only)      | 3005 |
| `lighthaus/`     | Lighthaus status board UI                        | 3006 |
| `lighthaus-api/` | Lighthaus monitoring backend (probes, incidents) | 3007 |

The commerce admin talks to the separate [`sitehaus-commerce`](https://github.com/SiteHaus/ecommerce-api) backend. `docs/` is deliberately **not deployed** — it documents internal architecture and stays on `docs.localhost`.

### Packages

| Package          | Description                                        |
| ---------------- | -------------------------------------------------- |
| `db/`            | Drizzle ORM database layer (PostgreSQL)            |
| `contracts/`     | ts-rest API contracts for type-safe communication  |
| `sdk/`           | Client SDK with automatic token refresh            |
| `client-sdk/`    | Server-side SDK for services validating IAM tokens |
| `monitoring/`    | Lighthaus pure check core (http/dns/ssl/heartbeat) |
| `validation/`    | Zod schemas shared across apps                     |
| `ui/`            | Shared UI components (shadcn/ui)                   |
| `stores/`        | Zustand state management                           |
| `transactional/` | React Email templates                              |
| `utils/`         | Shared utilities                                   |

## Development

### Requirements

- Node.js v20+
- pnpm v10.14.0 (install via corepack: `corepack enable && corepack prepare pnpm@10.14.0 --activate`)
- Docker and Docker Compose

### Getting Started

```bash
# Install dependencies
pnpm i

# Start PostgreSQL
docker compose -f docker-compose.dev.yml up -d

# Run database migrations
pnpm --filter db db:migrate

# Start all apps in development
pnpm dev
```

### Running Individual Apps

```bash
pnpm dev --filter=web            # Marketing site
pnpm dev --filter=dashboard      # Dashboard
pnpm dev --filter=iam            # IAM portal
pnpm dev --filter=api            # API server
pnpm dev --filter=commerce       # Commerce admin
pnpm dev --filter=docs           # Docs site
pnpm dev --filter=lighthaus      # Status board UI
pnpm dev --filter=lighthaus-api  # Monitoring backend
```

For HTTPS `.localhost` domains that mirror production (cookie scoping, OAuth redirects), run Caddy: `sudo caddy run --config infra/Caddyfile.dev`

### Database Commands

```bash
pnpm --filter db db:gen      # Generate migrations
pnpm --filter db db:migrate  # Run migrations
pnpm --filter db db:push     # Push schema (dev only)
pnpm --filter db db:seed     # Seed database
```

## Building

```bash
# Build all apps
pnpm build

# Build specific app with dependencies
pnpm build --filter=api...
pnpm build --filter=iam...
```

## Testing

```bash
# Run all tests
pnpm test

# API tests
pnpm --filter api test        # Unit tests
pnpm --filter api test:e2e    # E2E tests
pnpm --filter api test:cov    # Coverage
```

## CI/CD

- **CI**: Runs type checking, linting, and builds on PRs to `main`
- **CD**: On merge to `main`, builds Docker images, deploys to **staging** (running DB migrations first), waits for a **manual approval gate**, then rebuilds and deploys to **production**

### Docker Images

Images are built in parallel and published to ghcr.io:

- `ghcr.io/sitehaus/sitehaus-web`
- `ghcr.io/sitehaus/sitehaus-dashboard`
- `ghcr.io/sitehaus/sitehaus-iam`
- `ghcr.io/sitehaus/sitehaus-api`
- `ghcr.io/sitehaus/sitehaus-commerce`
- `ghcr.io/sitehaus/sitehaus-lighthaus`
- `ghcr.io/sitehaus/sitehaus-lighthaus-api`

### Local Docker Build

```bash
# Build and run all services
docker compose -f docker-compose.prod.yml up --build
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `ACCESS_TTL_SEC` / `REFRESH_TTL_SEC` - Token expiration times

Apps with their own configuration (`apps/api`, `apps/lighthaus-api`, `apps/lighthaus`, `apps/commerce`) each ship an `.env.example` documenting their full set.

## Monitoring (Lighthaus)

`lighthaus-api` probes every deployed service and client site (HTTP, DNS, SSL/domain expiry, email DNS, health endpoints, push heartbeats), opens/resolves incidents, emails ops via the shared notifications queue (with a direct-Resend failsafe), and publishes a failure-domain-independent `status.json` snapshot to R2. The `lighthaus` app is the IAM-authenticated status board — staff see everything, clients see their own sites.

## Tech Stack

- **Frontend**: Next.js 15+, React 19, Tailwind CSS 4
- **Backend**: NestJS 11, Express
- **Database**: PostgreSQL, Drizzle ORM
- **API**: ts-rest contracts
- **Monorepo**: Turborepo, pnpm workspaces
- **Deployment**: Docker, Caddy, GitHub Actions
