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

### Agency / Dashboard (Task 7)

All arrows from `dashboard` (sitehaus :3001) to the IAM API (`apps/api`, :3003),
via `@site-haus/stores` `getApi()` (typed by `@site-haus/contracts`). Auth flow
itself is in the Identity sweep; only feature data calls are listed here.

- `dashboard → api GET/POST /projects`, `GET/PATCH/DELETE /projects/:id`, `PATCH /projects/:id/status` — projects CRUD + lifecycle.
- `dashboard → api GET /milestones/upcoming`, `GET/POST /projects/:id/milestones`, `PATCH/DELETE /milestones/:id`, `POST /milestones/:id/sign-off`, `POST /milestones/reorder` — milestones.
- `dashboard → api GET/POST /tickets`, `GET/PATCH /tickets/:id`, `PATCH /tickets/:id/status` + `/assign`, attachments `GET/POST/DELETE /tickets/:id/attachments` — tickets.
- `dashboard → api GET/POST /projects/:id/assets`, upload, `PATCH/DELETE .../:assetId` — assets (storage via R2).
- `dashboard → api GET/POST/PATCH /projects/:id/design-document`, `/publish`, `/status`, `/versions`, `/versions/:version` — design documents + versions.
- `dashboard → api GET /billing`, `GET /billing/portal`, `GET /billing/admin`, `POST /billing/subscriptions`, `POST /billing/one-time` — billing (client + admin).
- `dashboard → api GET /business-profiles/me`, `GET /business-profiles/:clientId`, `POST /business-profiles`, `PATCH /business-profiles/me` — business profiles.
- `dashboard → api GET/POST /comments`, `PATCH/DELETE /comments/:id` — polymorphic comments (ticket / design-doc / project).
- `dashboard → api GET /clients/me/clients`, `/current`, `/me/members` — clients directory + context.
- `dashboard → api GET /audit` — filterable audit log.
- `api billing → Stripe` — `getOrCreateCustomer`, `subscriptions.create` (send_invoice, 30-day), one-time invoices, `billingPortal.sessions.create`.
- `Stripe → api POST` (webhook, `stripe-webhook.controller.ts`) — `customer.subscription.updated/deleted` synced into `core/billing-records`.
- `api notifications → BullMQ` — `NotificationsService.enqueue` adds jobs to the `notifications` queue (retry/backoff); processed by `notifications.processor.ts`.
- API controllers are plain NestJS (`@Controller('billing')` etc.) that manually
  parse against `@site-haus/validation`; the contracts are **not** enforced
  server-side (same pattern as the auth domain, F-002).

### Client Sites (Task 8)

Each client site is a standalone Next.js 16 repo deployed on Vercel, not part of the
`sitehaus` monorepo. See [Client Sites — Integration Pattern](/domains/client-sites/).

- `camo-web → gateway /v1/catalog/*` — public catalog via `publicFetch` (server
  components), `x-store-slug: camo`.
- `camo-web → gateway /v1/cart*`, `/v1/checkout/intent`, `/v1/orders/*` — authed via
  `commerceFetch` (Bearer IAM token + `credentials: include`); 401 → `/login`.
  Checkout redirects to the Stripe `checkoutUrl`.
- `camo-web → api GET /auth/authorize` + `POST /auth/token` — OAuth PKCE via
  `@sitehaus/client-sdk/frontend` (client_key `camo`); `bootstrap()` silent-refresh
  from `sh_refresh_camo`.
- `nayadnara → gateway /v1/*` and `→ api /auth/*` — same as camo-web (it is a fork);
  client_key `nayadnara`, slug `nayadnara`.
- `onehealthclinics → /api/ecom/* → gateway /v1/*` — **anonymous**. Browser calls go
  through the same-origin Next rewrite `/api/ecom/:path*` → `NEXT_PUBLIC_ECOM_API_URL`
  (ITP cookie workaround); SSR/RSC calls hit the gateway directly. `x-store-slug:
  onehealthclinics`, no `Authorization`. No IAM arrow.
- `nayadnara / onehealthclinics → Resend` — server-action contact form, gated by
  Cloudflare Turnstile.
- `onehealthclinics → Google Places API` — live reviews widget.

_Remaining domain: infrastructure & ops (Task 9, `sitehaus-cli` + Docker/Caddy)._

## Packages

### Identity & Auth (Task 5)

| Package | Repo / location | Role in auth |
| ------- | --------------- | ------------ |
| `@site-haus/sdk` | sitehaus `packages/sdk` | Typed API client + PKCE helpers (`oauth.ts`), token-attach fetcher, refresh + single-refresh lock |
| `@site-haus/contracts` | sitehaus `packages/contracts` | ts-rest route/schema definitions (auth, session, device, role, password, invite, client) — typed clients; **not** enforced server-side |
| `@site-haus/stores` | sitehaus `packages/stores` | Zustand `auth-store.ts` — in-memory access token, `bootstrap`/`me`/`login`/`logout` |
| `@sitehaus-ecom/auth` | sitehaus-commerce `packages/auth` | Small NestJS package — exports only `StoreOwnerGuard` + store/user context types |
| `@sitehaus/client-sdk` | **published npm package** (v0.3.0), installed from registry into the **sitehaus-commerce gateway**; the **client sites instead vendor a v0.4.0 tarball** (`file:./vendor/sitehaus-client-sdk-0.4.0.tgz`) — see the Client Sites packages row and F-020 for the version/distribution skew | `/nestjs` exports `SiteHausAuthModule`, `AccessGuard`, `PermissionGuard`, `Public`, `IntrospectionService` (calls `/auth/introspect`); `/frontend` exports `useAuthStore`, `generatePKCE`, `buildAuthorizationUrl`, `exchangeCodeForTokens` |

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

### Agency / Dashboard (Task 7)

| Package | Repo / location | Role in dashboard |
| ------- | --------------- | ----------------- |
| `@site-haus/ui` | sitehaus `packages/ui` | shadcn/ui components + `ThemeProvider`, `PageHero`, sidebar primitives used across every page. |
| `@site-haus/utils` | sitehaus `packages/utils` | `core/format` — `formatDate`, `formatCents`, `label` (canonical formatters; some pages still inline their own, F-016). |
| `@site-haus/validation` | sitehaus `packages/validation` | Zod form schemas (react-hook-form resolvers); also parsed server-side by the API controllers. |
| `@site-haus/contracts` | sitehaus `packages/contracts` | ts-rest route/type definitions for projects, milestones, tickets, assets, billing, business-profiles, design-documents, comments, clients, audit — types the `getApi()` client (not enforced server-side). |
| `@site-haus/stores` | sitehaus `packages/stores` | `auth-store` (token, `hasPerm`, `clients`, `managedClientId`) + `getApi()`/`initStoresSdk` fetcher. |
| `@site-haus/sdk` | sitehaus `packages/sdk` | PKCE helpers (`generatePKCE`) used by `RequireAuth`. |
| dashboard libs (local) | sitehaus `apps/dashboard/lib` + `hooks` | `query-keys.ts` (key factories), `variants.ts` (badge variant helpers), `require-auth.tsx`; `hooks/use-*` React Query wrappers (billing, milestones, assets, comments, clients, design-doc, breadcrumbs) and the `use-is-employee` / `use-client-context` Zustand selectors. |

### Client Sites (Task 8)

| Package | Repo / location | Role in client sites |
| ------- | --------------- | -------------------- |
| `@sitehaus/client-sdk` | camo-web/nayadnara: **vendored** `vendor/sitehaus-client-sdk-0.4.0.tgz` (local file dep, byte-identical across both); onehealthclinics does not use it | `/frontend` `useAuthStore`, `initStoresSdk`, `generatePKCE`, `generateState`, `buildAuthorizationUrl`, `exchangeCodeForTokens` — the entire OAuth/token layer for the authed storefronts. (The Identity-sweep row calls this "published npm, not vendored"; the client sites actually pin a vendored v0.4.0 tarball — see Findings F-020.) |
| storefront commerce libs (local) | camo-web/nayadnara `src/lib/commerce.ts` + `src/types/commerce.ts`; onehealthclinics `lib/ecom/client.ts` + `lib/ecom/types.ts` | Hand-written commerce fetch clients + DTO types, duplicated across sites (Findings F-008, F-018). No shared/published storefront SDK exists. |
| `@tanstack/react-query` | npm, camo-web + nayadnara | Provider configured in `providers.tsx`; little actual query usage beyond auth. |
| `resend`, `@marsidev/react-turnstile` | npm | Contact-form email + bot protection (nayadnara, onehealthclinics). |
| `pagefind` | npm, onehealthclinics | Static site search built post-`next build`. |

_All five domains documented. Task 9 (infrastructure: `sitehaus-cli`, Docker, Caddy) remains._
