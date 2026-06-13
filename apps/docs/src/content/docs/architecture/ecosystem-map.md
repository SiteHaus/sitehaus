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

### Identity & Auth (Task 5)

- `iam → api POST /auth/login` — email/password login (returns access token, `requires2FA?`)
- `iam → api POST /auth/sso-link` — form-POST bridge: seeds first-party `sh_refresh_<key>` cookie, then redirects to `/auth/authorize`
- `dashboard → api GET /auth/authorize` — OAuth2 authorize (client_key `dashboard`)
- `dashboard → api POST /auth/token` — PKCE code exchange (via `@site-haus/sdk` `exchangeCodeForTokens`)
- `dashboard → api POST /auth/refresh` — silent refresh from `sh_refresh_dashboard` cookie (via `@site-haus/stores` bootstrap)
- `dashboard → api GET /auth/me` — load user + session + permissions
- `commerce (admin) → api GET /auth/authorize`, `POST /auth/token`, `POST /auth/refresh`, `GET /auth/me` — same OAuth flow, client_key `sitehaus-commerce-admin`
- `camo-web → api GET /auth/authorize` + `POST /auth/token` — PKCE flow via `@sitehaus/client-sdk/frontend`
- `nayadnara → api GET /auth/authorize` + `POST /auth/token` — identical to camo-web
- `commerce gateway → iam POST /auth/introspect` — server-side token validation (via `@sitehaus/client-sdk/nestjs` `IntrospectionService`, `x-client-key`, ~5s cache). No local JWT verification.
- `onehealthclinics` — no auth arrow; consumes the commerce API anonymously, no IAM integration.

### Commerce (Task 6)

- `commerce admin (sitehaus :3004) → gateway /v1/admin/*` — all store admin CRUD
  (products, variants, options, images, collections, inventory, orders, shipping,
  discounts, webhooks, analytics, stores/settings). Bearer IAM token +
  `x-client-id` for managed stores.
- `camo-web → gateway /v1/*` — storefront reads/cart/checkout via
  `src/lib/commerce.ts`, `x-store-slug` header; auth via `@sitehaus/client-sdk/frontend`.
- `nayadnara → gateway /v1/*` — identical pattern to camo-web (same client file).
- `onehealthclinics → gateway /v1/*` — **anonymous**, browser calls routed through
  a same-origin Next proxy `/api/ecom` (ITP cookie workaround); `x-store-slug`.
- `gateway → commerce TCP (:7021)` — `COMMERCE_SERVICE` proxy, `catalog.*`,
  `cart.*`, `orders.*`, `inventory.*`, `shipping.*`, `discounts.*`, `returns.*`,
  `customers.*`, `analytics.*`, `webhooks.*`, `checkout.createOrder`.
- `gateway → payments TCP (:7022)` — `PAYMENTS_SERVICE` proxy, `stripe.*`,
  `payments.refund`, `payments.discounts.*`; emits event `payments.webhook.stripe`.
- `payments → Stripe` — Connect (Express) onboarding, Checkout Sessions on the
  connected account, refunds, coupons/promo codes, inbound webhook.
- `worker → Redis (BullMQ)` — consumes `ecom-{analytics,inventory,orders,notifications,catalog,returns,webhooks}`.
- `worker → Resend` — transactional emails (order confirmed/shipped/delivered,
  refunds, returns, abandoned cart).
- `worker → external store webhook URLs` — outbound HMAC-signed
  (`X-SiteHaus-Signature`) deliveries.
- `worker / commerce → R2 (Cloudflare)` — product image storage via shared `R2Service`
  (presigned PUT + CDN URL).
- `gateway → IAM POST /auth/introspect` — token validation (see Identity sweep;
  not repeated).

_Remaining domains (Agency, etc.) filled in during Tasks 7–9._

## Packages

### Identity & Auth (Task 5)

| Package | Repo / location | Role in auth |
| ------- | --------------- | ------------ |
| `@site-haus/sdk` | sitehaus `packages/sdk` | Typed API client + PKCE helpers (`oauth.ts`), token-attach fetcher, refresh + single-refresh lock |
| `@site-haus/contracts` | sitehaus `packages/contracts` | ts-rest route/schema definitions (auth, session, device, role, password, invite, client) — typed clients; **not** enforced server-side |
| `@site-haus/stores` | sitehaus `packages/stores` | Zustand `auth-store.ts` — in-memory access token, `bootstrap`/`me`/`login`/`logout` |
| `@sitehaus-ecom/auth` | sitehaus-commerce `packages/auth` | Small NestJS package — exports only `StoreOwnerGuard` + store/user context types |
| `@sitehaus/client-sdk` | **published npm package** (v0.3.0), installed from registry into sitehaus-commerce + client sites; not vendored or workspace-linked | `/nestjs` exports `SiteHausAuthModule`, `AccessGuard`, `PermissionGuard`, `Public`, `IntrospectionService` (calls `/auth/introspect`); `/frontend` exports `useAuthStore`, `generatePKCE`, `buildAuthorizationUrl`, `exchangeCodeForTokens` |

### Commerce (Task 6)

| Package | Repo / location | Role in commerce |
| ------- | --------------- | ---------------- |
| `@sitehaus-ecom/database` | sitehaus-commerce `packages/database` | Drizzle schema — ~30 tables (stores, products/variants/options, carts, orders, inventory/reservations, shipping, discounts, returns, customers, analytics_events, webhook_endpoints/deliveries, audit). Exports `createDb`, `Db`, `runMigrations`. |
| `@sitehaus-ecom/contracts` | sitehaus-commerce `packages/contracts` | ts-rest routers for all `/v1` HTTP routes; **enforced** by the gateway via `@TsRestHandler` (contrast with sitehaus API, F-002). Drives Swagger. |
| `@sitehaus-ecom/validation` | sitehaus-commerce `packages/validation` | Zod request/response schemas shared by contracts + services. |
| `@sitehaus-ecom/shared` | sitehaus-commerce `packages/shared` | `DbModule`, `EmailModule` (Resend `EmailService`), `R2Module`/`R2Service` (S3 client → Cloudflare R2), `AuditModule`/`AuditService`, `DB_TOKEN`. |
| `@sitehaus-ecom/email-templates` | sitehaus-commerce `packages/email-templates` | React Email templates (order confirmed/shipped/delivered, refund issued/requested, return refunded, abandoned cart). |
| `@sitehaus-ecom/auth` | sitehaus-commerce `packages/auth` | Small NestJS package — `StoreOwnerGuard` + store/user context types (see Identity sweep). |
| `@sitehaus/client-sdk` | published npm | `/nestjs` AccessGuard/PermissionGuard/IntrospectionService used by the gateway; `/frontend` used by storefronts. (Identity sweep.) |
| admin UI libs | sitehaus `apps/commerce/lib/commerce.ts` | Hand-written fetch client + hand-maintained types for the :3004 admin (not generated from contracts). |

_Remaining packages filled in during Tasks 7–9._
