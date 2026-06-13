---
title: Ecosystem Map
description: Every repo, app, package, and port in the SiteHaus platform, and who calls what.
---

## Repos

| Repo              | Location (dev)            | Stack                                                                                   |
| ----------------- | ------------------------- | --------------------------------------------------------------------------------------- |
| sitehaus          | `~/Dev/sitehaus`          | Turborepo, Next.js 15, NestJS 11, Drizzle/Postgres                                       |
| sitehaus-commerce | `~/Dev/sitehaus-commerce` | Turborepo, NestJS 11 microservices, Drizzle/Postgres, BullMQ/Redis, Stripe Connect, R2  |
| sitehaus-cli      | `~/Dev/sitehaus-cli`      | Rust, SSH + Docker Compose ops                                                           |
| onehealthclinics  | `~/Dev/onehealthclinics`  | Next.js client site                                                                      |
| camo-web          | `~/Dev/camo-web`          | Next.js client site + commerce storefront                                               |
| nayadnara         | `~/Dev/nayadnara`         | Next.js client site + commerce storefront                                               |

## Apps & ports

| App / service       | Repo              | Port | Local domain             |
| ------------------- | ----------------- | ---- | ------------------------ |
| web (marketing)     | sitehaus          | 3000 | `sitehaus.localhost`     |
| dashboard           | sitehaus          | 3001 | `dashboard.localhost`    |
| iam                 | sitehaus          | 3002 | `iam.localhost`          |
| api (NestJS)        | sitehaus          | 3003 | `api.localhost`          |
| commerce (admin UI) | sitehaus          | 3004 | `commerce.localhost`     |
| docs                | sitehaus          | 3005 | `docs.localhost`         |
| gateway (HTTP)      | sitehaus-commerce | 7020 | `commerce-api.localhost` |
| commerce (TCP)      | sitehaus-commerce | 7021 | internal only            |
| payments (TCP)      | sitehaus-commerce | 7022 | internal only            |
| worker (BullMQ)     | sitehaus-commerce | —    | internal only            |
| email preview       | sitehaus          | 6969 | —                        |

## Who calls what

_Filled in domain-by-domain during the discovery sweeps (Tasks 5–9)._

## Packages

_Filled in domain-by-domain during the discovery sweeps (Tasks 5–9)._
