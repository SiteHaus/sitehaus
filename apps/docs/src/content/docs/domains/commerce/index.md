---
title: Commerce — Feature Inventory
description: What the SiteHaus commerce platform does, where each feature lives, and how the storefronts and admin UI consume it.
---

## Overview

SiteHaus Commerce is a **multi-tenant ecommerce platform** implemented as a set of
NestJS microservices in the `sitehaus-commerce` repo. A single public HTTP
**gateway** (`apps/gateway`, :7020) fronts two internal TCP services — **commerce**
(`apps/commerce`, :7021: catalog, cart, orders, inventory, collections, shipping,
discounts, returns, customers, analytics, images) and **payments**
(`apps/payments`, :7022: Stripe Connect, checkout intents, the Stripe webhook,
refunds) — plus a headless **worker** (`apps/worker`, BullMQ) for scheduled and
async jobs. The gateway proxies every request to a service via TCP
`MessagePattern`s and returns the result over HTTP.

Multi-tenancy is keyed on **`store`**. Each store row carries a `clientId` (the
SiteHaus IAM clientId — stored as a plain `uuid` with **no FK**, because the IAM
database is separate) plus a `slug` and optional custom `domain`. Storefronts
identify their store with an `x-store-slug` header; the admin UI resolves the
store from the authenticated user's `clientId` (or an `x-client-id` override for
first-party clients). Auth is delegated entirely to IAM — the gateway validates
bearer tokens via `@sitehaus/client-sdk/nestjs` token introspection (see the
[Identity sweep](/architecture/auth/)); commerce verifies no JWTs locally.

The **admin UI** is a separate Next.js app that lives in the *sitehaus* repo at
`apps/commerce` (:3004), not in `sitehaus-commerce`. Client storefronts
(`camo-web`, `nayadnara`, `onehealthclinics`) are independent Next.js sites that
call the gateway directly.

## Features

| Feature | Where (repo + path) | Status | Key files |
| ------- | ------------------- | ------ | --------- |
| Catalog / products | sitehaus-commerce `apps/commerce/src/products`, gateway `apps/gateway/src/products` | live | `products-admin.controller.ts`, `catalog.products.*` patterns |
| Product options & values | `apps/commerce/src/options`, gateway `apps/gateway/src/options` | live | `catalog.options.*`, `catalog.options.values.*` |
| Variants | `apps/commerce/src/variants`, gateway `apps/gateway/src/variants` | live | `catalog.variants.*` |
| Product images (R2 upload) | `apps/commerce/src/images`, gateway `apps/gateway/src/product-images` | live | `images-handler.service.ts`, `catalog.images.uploadUrl/confirm` |
| Collections | `apps/commerce/src/collections`, gateway `apps/gateway/src/collections` | live | `catalog.collections.*` |
| Cart | `apps/commerce/src/cart`, gateway `apps/gateway/src/cart` | live | `cart.get/addItem/updateItem/removeItem/merge` |
| Anonymous session | gateway `apps/gateway/src/anon-session` | live | `anon-session.service.ts` — signed `store_session` JWT cookie, 7d |
| Checkout (intent → Stripe session) | gateway `apps/gateway/src/checkout`, payments `apps/payments/src/intent` | live | `checkout.controller.ts`, `checkout.createOrder`, `stripe.intent.create` |
| Orders (customer + admin) | `apps/commerce/src/orders`, gateway `apps/gateway/src/orders` | live | `orders.controller.ts`, `orders-admin.controller.ts`, `orders.*` |
| Order fulfillment (ship/collect) | `apps/commerce/src/orders`, gateway `apps/gateway/src/orders` | live | `orders.ship`, `orders.collect` (collect = pickup fulfillment) |
| Stock / inventory + reservations | `apps/commerce/src/inventory`, gateway `apps/gateway/src/inventory` | live | `inventory.reserve/commit/release/adjust/expireStale` |
| Shipping zones & rates | `apps/commerce/src/shipping`, gateway `apps/gateway/src/shipping` | live | `shipping.*Zone/*Rate`, `shipping.getRates` |
| Discounts & codes | `apps/commerce/src/discounts`, payments `apps/payments/src/discounts`, gateway `apps/gateway/src/discounts` | live | `discounts.*` (commerce) + `payments.discounts.*` (Stripe coupons) |
| Stripe Connect onboarding | payments `apps/payments/src/connect`, gateway `apps/gateway/src/store` | live | `connect.service.ts`, `stripe.connect.initiate`, `stripe.account.sync` |
| Payments / checkout sessions | payments `apps/payments/src/intent` | live | `intent.service.ts` — Stripe Checkout Session on connected account |
| Refunds | payments `apps/payments/src/refund`, gateway `apps/gateway/src/orders` | live | `payments.refund`, `orders/:id/refund` route |
| Tax | payments `apps/payments/src/intent` + webhook | partial | tax is read from Stripe `total_details.amount_tax` on session completion; no independent tax engine |
| Inbound Stripe webhook | gateway `apps/gateway/src/checkout` → payments `apps/payments/src/webhook` | live | `POST /v1/webhooks/stripe` → `EventPattern("payments.webhook.stripe")` |
| Outbound store webhooks | `apps/commerce/src/webhooks`, gateway `apps/gateway/src/webhooks`, worker `webhook.processor.ts` | live | `webhooks.*` patterns; HMAC `X-SiteHaus-Signature`; `webhook_endpoints`/`webhook_deliveries` |
| Returns / RMA | `apps/commerce/src/returns`, gateway `apps/gateway/src/returns` | live | `returns.*`, `store_return_settings`, `return-refund.processor.ts` |
| Customers | `apps/commerce/src/customers`, gateway `apps/gateway/src/customers` | live | `customers.*`, `/v1/me/profile`, `/v1/me/orders` |
| Analytics | `apps/commerce/src/analytics`, gateway `apps/gateway/src/analytics` | live | `analytics.trackEvent/revenue/topProducts/funnel/abandonedCarts` |
| R2 file storage | shared `packages/shared/src/r2` | live | `r2.service.ts` — presigned PUT, `S3Client`, CDN URL |
| Transactional email | shared `packages/shared/src/email`, `packages/email-templates` | live | `email.service.ts` (Resend); React Email templates |
| Background jobs | worker `apps/worker/src/processors` | live | reservation/cart expire, publish-scheduled, notifications, webhook dispatch, return refund, analytics retention |

## Integration points

- **Storefronts → gateway (:7020)**: `camo-web` and `nayadnara` use
  `@sitehaus/client-sdk/frontend` for auth and a hand-written `src/lib/commerce.ts`
  fetch wrapper sending `x-store-slug`. `onehealthclinics` is **anonymous** (no
  IAM) and routes browser calls through a same-origin Next.js proxy
  (`/api/ecom`) to keep the `store_session` cookie first-party (iOS ITP
  workaround).
- **Admin UI (:3004) → gateway**: `sitehaus/apps/commerce/lib/commerce.ts` sends
  `Authorization: Bearer <IAM access token>` and an optional `x-client-id`
  (managed-store override).
- **Gateway → TCP services**: every gateway controller injects `COMMERCE_SERVICE`
  and/or `PAYMENTS_SERVICE` `ClientProxy` and `.send()`s a `MessagePattern`.
- **Payments → Stripe**: Stripe Connect (Express accounts), Checkout Sessions
  created on the connected account, refunds, coupons/promo codes, and the inbound
  webhook.
- **Worker → Redis / R2 / Resend**: BullMQ queues backed by Redis; emails via
  Resend; (image cleanup paths touch R2 via the shared service).
- **Auth dependency on IAM**: the gateway uses `@sitehaus/client-sdk/nestjs`
  introspection against IAM `POST /auth/introspect`. Documented in the
  [auth flow](/architecture/auth/) — not repeated here.

## Notes for deep-dives

- **Order lifecycle**: `checkout.createOrder` (status `pending`, reserves stock) →
  Stripe Checkout → `checkout.session.completed` webhook commits reservations,
  sets `confirmed`, deletes the cart, queues `order.confirmed` notification +
  outbound webhook → admin `ship`/`collect` → `delivered`; `refund` path issues a
  Stripe refund and (via returns) restocks. A tier-3 state-machine page would be
  valuable.
- **Stripe Connect flow**: `stripe.connect.initiate` creates an Express account +
  account link; `stripe.account.sync` and a live retrieve in `intent.service.ts`
  reconcile `chargesEnabled`. Worth a dedicated page.
- **Multi-tenancy scoping**: store resolution has four fallbacks
  (`x-store-slug` → Host domain → `:slug` param → bearer-token `clientId`);
  admin routes bypass the middleware and resolve via `AdminStoreGuard`. Candidate
  for a scoping/security deep-dive.
