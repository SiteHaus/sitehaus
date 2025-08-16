# Site Haus

<div align="left" style="display: flex; gap: 8px;">
  <a href="https://github.com/SiteHaus/sitehaus/actions/workflows/github-code-scanning/codeql">
    <img src="https://github.com/SiteHaus/sitehaus/actions/workflows/github-code-scanning/codeql/badge.svg" alt="CodeQL" />
  </a>
  <a href="https://github.com/SiteHaus/sitehaus/actions/workflows/ci.yml">
    <img src="https://github.com/SiteHaus/sitehaus/actions/workflows/ci.yml/badge.svg" alt="CI/CD" />
  </a>
</div>

A full-stack monorepo for SiteHaus projects. Built with **Next.js, NestJS, Turborepo, TypeScript, Docker, and PostgreSQL**.

## 📂 Structure

The repo is organized as a [Turborepo](https://turborepo.com/docs):

### Apps

- `api/` - NestJS backend (Soon)
- `dashboard/` - Next dashboard app for clients and developers
- `iam/` - Next Identity Management Portal & Auth Service
- `web/` - Marketing site

### Packages

- `db/` – Shared database layer (Drizzle/Postgres)
- `stores/` – Zustand state management
- `validation/` – Zod schemas shared across apps
- `ui/` – All shared ui, and shadcn components
- `iam-core/` – Contains all shared iam-core utilities

## 🛠️ Development

## Requirements

- Node.js (v20+ recommended)
- pnpm (install through corepack or npm) we're using v10.14.0
- Docker and docker-compose 🐳

### Getting Started

```sh
pnpm i
pnpm dev
```

This will run all of the applications, make sure to run in project root.
