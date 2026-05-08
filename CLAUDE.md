# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

SiteHaus is a full-stack monorepo built with **Next.js, NestJS, Turborepo, TypeScript, Docker, and PostgreSQL**. It provides an Identity and Access Management (IAM) system with a marketing site, dashboard, and API backend.

## Technology Stack

- **Monorepo**: Turborepo with pnpm workspaces
- **Package Manager**: pnpm v10.14.0 (required - use corepack or npm to install)
- **Node.js**: v20+ recommended
- **Frontend**: Next.js 15.4+ with React 19, Tailwind CSS 4.x
- **Backend**: NestJS 11.x with Express
- **Database**: PostgreSQL with Drizzle ORM
- **API Contracts**: ts-rest for type-safe API contracts
- **Testing**: Jest for unit/e2e tests
- **Docker**: Docker Compose for local development

## Commands

### Development

```bash
# Install dependencies (from project root)
pnpm i

# Run all apps in development mode
pnpm dev

# Run specific app only
cd apps/iam && pnpm dev      # IAM portal on :3002
cd apps/dashboard && pnpm dev # Dashboard on :3001
cd apps/web && pnpm dev      # Marketing site on :3000
cd apps/api && pnpm dev      # NestJS API

# Run with Docker
docker-compose -f docker-compose.dev.yml up
```

### Building

```bash
# Build all apps
pnpm build

# Build specific app
pnpm build --filter=iam
pnpm build --filter=dashboard
pnpm build --filter=web
pnpm build --filter=api
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in specific app
cd apps/api && pnpm test           # Run all tests
cd apps/api && pnpm test:watch     # Watch mode
cd apps/api && pnpm test:cov       # Coverage
cd apps/api && pnpm test:e2e       # E2E tests
```

### Type Checking and Linting

```bash
# Type check all apps
pnpm check-types

# Lint all apps
pnpm lint

# Format all files
pnpm format
```

### Database Operations

```bash
# Generate Drizzle migrations
cd packages/db && pnpm db:gen

# Run migrations
cd packages/db && pnpm db:migrate

# Push schema to database (dev only)
cd packages/db && pnpm db:push

# Seed database
cd packages/db && pnpm db:seed

# Grant admin role to user
cd packages/db && pnpm grant-admin
```

### Email Development

```bash
# Start email preview server on port 6969
cd packages/transactional && pnpm dev

# Export emails
cd packages/transactional && pnpm export
```

## Architecture

### Apps

- **`apps/api/`** - NestJS backend API
  - Authentication & authorization with JWT
  - Password-based auth, OTP, device management
  - User invites, roles, permissions
  - Session management
  - Email integration (Resend)
  - Uses `@site-haus/db`, `@site-haus/contracts`, `@site-haus/transactional`

- **`apps/iam/`** - Next.js Identity Management Portal (:3002)
  - User authentication UI (login, register)
  - IAM-specific frontend
  - Uses `@site-haus/ui`, `@site-haus/sdk`, `@site-haus/contracts`

- **`apps/dashboard/`** - Next.js Dashboard (:3001)
  - Client and developer dashboard
  - Uses `@site-haus/ui`, `@site-haus/db`

- **`apps/web/`** - Next.js Marketing Site (:3000)
  - Public-facing website
  - Uses `@site-haus/ui`

### Packages

- **`packages/db/`** - Drizzle ORM database layer
  - Schema organized into `iam/` and `core/` domains
  - IAM tables: users, sessions, devices, roles, invites, auth-codes, otps, password-credentials, clients
  - Core tables: projects, audit-logs
  - Exports typed `Db` client and `createDb()` factory
  - Uses snake_case for database columns

- **`packages/contracts/`** - ts-rest API contracts
  - Type-safe API contracts shared between frontend and backend
  - Defines routes for: auth, devices, roles, sessions, password, invites, clients
  - Uses `@site-haus/validation` for request/response schemas

- **`packages/sdk/`** - Client SDK
  - Provides configured API client with authentication
  - Token refresh logic
  - Uses `@site-haus/contracts` for type safety

- **`packages/validation/`** - Zod validation schemas
  - Shared validation logic across apps
  - Form schemas for users and other entities

- **`packages/ui/`** - Shared UI components
  - shadcn/ui components
  - Shared Tailwind configuration

- **`packages/transactional/`** - Transactional email templates
  - React Email components
  - Email preview server

- **`packages/stores/`** - Zustand state management
  - Shared state logic

- **`packages/utils/`** - Shared utilities
  - Common helper functions

- **`packages/eslint-config/`** - Shared ESLint configuration
- **`packages/typescript-config/`** - Shared TypeScript configurations

### Key Patterns

**Type-safe API Communication**: The API uses ts-rest contracts (`@site-haus/contracts`) that define routes, request/response schemas, and are shared between the NestJS backend and Next.js frontends. The SDK (`@site-haus/sdk`) provides a configured client with automatic token refresh.

**Database Access**: All database access goes through the `@site-haus/db` package which exports Drizzle schemas and a typed database client. The database is organized into domain-specific schemas (iam/, core/) with separate files for tables and relations.

**Workspace Dependencies**: Internal packages use `workspace:*` protocol. All packages build to `dist/` directories and are referenced via TypeScript path aliases.

**Authentication Flow**: The API issues JWT access/refresh tokens stored in HTTP-only cookies. The SDK handles automatic token refresh. Guards (`access.guard.ts`, `permission.guard.ts`, `verified.guard.ts`) protect endpoints.

## Environment Variables

Required environment variables are in `.env.example`. Key variables:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` / `JWT_SECRET_B64URL` - JWT signing secrets
- `ACCESS_TTL_SEC` / `REFRESH_TTL_SEC` - Token expiration times

## CI/CD

The repository uses GitHub Actions:

- **CI** (`.github/workflows/ci.yml`): Runs type checking on PRs to main
- **CD** (`.github/workflows/cd.yml`): Deployment workflow
- **Discord Notify** (`.github/workflows/discord_notify.yml`): Notifications

## Sibling Repositories

This repo is part of a broader SiteHaus ecosystem. Related repos live at `~/Dev/`:

- **`sitehaus-commerce`** (`~/Dev/sitehaus-commerce`) — Multi-tenant ecommerce API. NestJS microservices: HTTP gateway (:7020), commerce TCP service (:7021), payments TCP service (:7022), BullMQ worker. Stripe Connect for payments, Cloudflare R2 for storage. Auth delegates to this IAM via `@sitehaus/client-sdk` token introspection.
- **`sitehaus-cli`** (`~/Dev/sitehaus-cli`) — Rust CLI (`sitehaus` binary) for managing production/staging servers. SSH-based, wraps Docker Compose operations. Config at `~/.sitehaus/config.yml`.

Each sibling repo has its own `CLAUDE.md` with full context.

## Local Dev Networking (Caddy)

All apps are proxied through Caddy for local development. Config: `infra/Caddyfile.dev`.

Run with: `sudo caddy run --config infra/Caddyfile.dev`

| Domain                   | App                       | Port  |
| ------------------------ | ------------------------- | ----- |
| `sitehaus.localhost`     | Marketing site            | :3000 |
| `dashboard.localhost`    | Dashboard                 | :3001 |
| `iam.localhost`          | IAM portal                | :3002 |
| `api.localhost`          | NestJS API                | :3003 |
| `commerce.localhost`     | Commerce admin UI         | :3004 |
| `commerce-api.localhost` | sitehaus-commerce gateway | :7020 |

Caddy provides HTTPS via auto-provisioned TLS for `.localhost` domains, enabling proper cookie scoping and OAuth redirect URIs that mirror production.

## Port Assignments

- 3000: Marketing site (web)
- 3001: Dashboard
- 3002: IAM portal
- 3003: NestJS API
- 3004: Commerce admin UI
- 6969: Email preview server (transactional)
- 5432: PostgreSQL (Docker)

## Architecture Docs

- [`docs/architecture/auth-flow.md`](docs/architecture/auth-flow.md) — End-to-end OAuth PKCE + JWT + session auth flow

## App-Level Standards

Each app has its own `CLAUDE.md` with app-specific patterns and rules. See:

- `apps/dashboard/CLAUDE.md` — React/Next standards, React Query, component organization
- `apps/api/CLAUDE.md` — NestJS guards, ts-rest controller pattern, service rules
- `apps/web/CLAUDE.md` — Marketing site, server components, SEO
- `apps/iam/CLAUDE.md` — IAM portal (feature-complete)
- `apps/commerce/CLAUDE.md` — Commerce admin UI, store context, commerce API
