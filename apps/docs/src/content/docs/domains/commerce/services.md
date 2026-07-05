---
title: Commerce — Service Topology
description: The four sitehaus-commerce services, their TCP message patterns, the tables they own, and the queues they use.
---

The `sitehaus-commerce` repo is a Turborepo of four NestJS services. Only the
**gateway** speaks HTTP; the **commerce** and **payments** services are TCP
microservices that the gateway proxies to; the **worker** has no listener at all.

## Services

### gateway (HTTP, :7020 — `commerce-api.localhost`)

- **Responsibility**: the only public surface. Versioned `/v1/...` routes,
  Swagger at `/docs` (generated from the ts-rest contracts), `helmet`,
  `cookie-parser`, CORS (`origin: true, credentials: true`), `/health`. Runs DB
  migrations on boot (`runMigrations`). Raw body is enabled so the Stripe webhook
  payload can be forwarded verbatim.
- **Controllers use ts-rest** (`@TsRestHandler` + `tsRestHandler`) — unlike the
  *sitehaus* IAM API, which does not (see F-002). Each handler `.send()`s a TCP
  message and maps the result to an HTTP status.
- **Auth**: `SiteHausAuthModule.forRootAsync(...)` from `@sitehaus/client-sdk/nestjs`
  registers `AccessGuard` + `PermissionGuard` globally with a 30s introspection
  cache (calls IAM `POST /auth/introspect`). Public routes opt out with
  `@Public()`. Per-store admin authorization is enforced by `AdminStoreGuard` +
  `@CommercePerm("<perm>")`. No JWTs are verified locally except an
  `jwt.decode` (unverified) in store-resolution to read `clientId`.
- **Rate limiting**: `ThrottlerModule` backed by Redis
  (`@nest-lab/throttler-storage-redis`); `SmartThrottlerGuard` keys by
  userId → sessionToken → IP. Defaults `default` (120/min) and `mutation`
  (30/min); checkout intent is tightened to 5/min.
- **Store resolution**: `StoreResolutionMiddleware` resolves `req.store` for
  storefront routes via `x-store-slug` → Host domain → `:slug` → token
  `clientId`; admin (`/admin/`) routes skip it and use `AdminStoreGuard`.
- **Anonymous session**: `AnonSessionMiddleware` issues/reads a signed
  `store_session` JWT cookie (`sub` = random UUID, 7-day expiry) used as the cart
  owner for guest shoppers.
- **TCP clients**: `COMMERCE_SERVICE` → `:7021`, `PAYMENTS_SERVICE` → `:7022`.
  `RpcExceptionFilter` maps RPC errors back to HTTP responses.

### commerce (TCP, :7021 — internal)

- **Responsibility**: all catalog, cart, order, inventory, collection, shipping,
  discount (domain side), returns, customer, analytics, and image logic. Pure
  `@nestjs/microservices` TCP server; `HttpToRpcExceptionFilter` normalizes
  errors.
- **Tables touched**: products, product_options, product_option_values,
  product_variants, variant_option_values, variant_images, product_images,
  collections, collection_products, carts, cart_items, orders, order_items,
  order_discounts, inventory, reservations, shipping_zones, shipping_rates,
  discounts, discount_codes, customers, returns, return_items,
  store_return_settings, analytics_events, webhook_endpoints, webhook_deliveries,
  store_audit_logs.
- **Queues**: enqueues notification/webhook/inventory jobs in some flows; does not
  run BullMQ processors itself (the worker does).

### payments (TCP, :7022 — internal)

- **Responsibility**: everything Stripe. Stripe Connect onboarding
  (`connect/`), Checkout Session creation (`intent/`), the inbound Stripe webhook
  (`webhook/`), refunds (`refund/`), and Stripe-side discounts
  (`discounts/` — coupons & promo codes).
- **Tables touched**: stores (Stripe account fields), orders, order_items,
  order_discounts, shipping_rates, customers, discounts/discount_codes (reads
  `stripeCouponId`).
- **Queues**: produces `ecom-notifications` (`order.confirmed`, etc.) and
  `ecom-webhooks` (`webhook.dispatch`) on successful checkout from the webhook
  handler.
- **Stripe**: instantiated with `STRIPE_SECRET_KEY`; Checkout Sessions are created
  on the store's connected account; `intent.service.ts` live-syncs
  `charges_enabled` if the DB flag is stale.

### worker (BullMQ, no port — internal)

- **Responsibility**: `NestFactory.createApplicationContext` (no HTTP/TCP). On
  boot it registers repeatable jobs and runs processors.
- **Queues consumed**: `ecom-analytics`, `ecom-inventory`, `ecom-orders`,
  `ecom-notifications`, `ecom-catalog`, `ecom-returns`, `ecom-webhooks`.
- **Repeatable schedules** (registered in `main.ts`):
  - `ecom-inventory` → `reservation.expire` — every minute
  - `ecom-orders` → `cart.expire` — daily 03:00 UTC
  - `ecom-catalog` → `catalog.publish-scheduled` — every minute
  - `ecom-analytics` → `analytics.purgeExpired` — daily 02:00 UTC
- **Processors**: `ReservationExpireProcessor`, `CartExpireProcessor`,
  `NotificationsProcessor` (sends Resend emails via per-event handlers in
  `processors/handlers/`), `PublishScheduledProcessor`, `ReturnRefundProcessor`,
  `WebhookProcessor` (outbound HMAC-signed delivery + delivery logging),
  `AnalyticsRetentionProcessor`.
- **Infra**: `DbModule`, `EmailModule` (Resend), `AuditModule` from
  `@sitehaus-ecom/shared`; R2 via the shared `R2Service`.

## TCP message patterns

`MessagePattern` (request/response) unless marked **event** (`EventPattern`,
fire-and-forget). Handling service: **C** = commerce (:7021), **P** = payments
(:7022).

| Pattern | Svc | Purpose |
| ------- | --- | ------- |
| `catalog.products.list` / `.get` / `.create` / `.update` / `.archive` | C | Admin product CRUD (delete = archive) |
| `catalog.products.listPublic` / `.getPublic` | C | Storefront product reads |
| `catalog.options.create` / `.update` / `.delete` | C | Product options |
| `catalog.options.values.create` / `.update` / `.delete` | C | Option values |
| `catalog.variants.create` / `.update` / `.delete` | C | Variants |
| `catalog.images.uploadUrl` / `.confirm` / `.list` / `.reorder` / `.delete` | C | Product images (R2 presigned upload) |
| `catalog.collections.create` / `.update` / `.delete` / `.list` / `.getCollection` / `.reorderProducts` / `.verify` | C | Admin collections |
| `catalog.collections.listPublic` / `.getPublicCollection` | C | Storefront collections |
| `cart.get` / `.addItem` / `.updateItem` / `.removeItem` / `.merge` | C | Cart ops (`merge` on login) |
| `checkout.createOrder` | C | Create pending order + reserve stock |
| `inventory.list` / `.get` / `.adjust` | C | Admin inventory |
| `inventory.reserve` / `.commit` / `.releaseByOrder` / `.expireStale` | C | Reservation lifecycle |
| `orders.adminList` / `.adminGet` | C | Admin order views |
| `orders.listForCustomer` / `.getForCustomer` | C | Customer order views |
| `orders.ship` | C | Mark shipped (+ tracking) |
| `orders.collect` | C | Mark collected (pickup fulfillment) |
| `shipping.listZones` / `.createZone` / `.updateZone` / `.deleteZone` | C | Shipping zones |
| `shipping.getRates` / `.createRate` / `.updateRate` / `.deleteRate` | C | Shipping rates |
| `discounts.list` / `.get` / `.create` / `.update` / `.delete` | C | Discounts |
| `discounts.createCode` / `.deleteCode` | C | Discount codes |
| `discounts.findApplicableAutomatic` | C | Auto-discount lookup at checkout |
| `discounts.getStripeCouponId` / `.snapshotOnOrder` | C | Bridge to Stripe coupon / order snapshot |
| `customers.list` / `.get` / `.update` / `.myProfile` / `.myOrders` | C | Customers + self-service |
| `returns.create` / `.lookup` / `.list` / `.get` / `.approve` / `.reject` / `.markReceived` / `.delete` | C | Returns / RMA |
| `returns.getSettings` / `.updateSettings` | C | Per-store return policy |
| `analytics.trackEvent` | C | Storefront event ingestion |
| `analytics.revenue` / `.topProducts` / `.funnel` / `.abandonedCarts` / `.abandonedCartsList` | C | Admin analytics |
| `webhooks.list` / `.create` / `.update` / `.delete` / `.listDeliveries` | C | Outbound webhook endpoint mgmt |
| `stripe.connect.initiate` | P | Create Express account + onboarding link |
| `stripe.account.sync` | P | Reconcile `charges_enabled` etc. from Stripe |
| `stripe.intent.create` | P | Create Stripe Checkout Session on connected account |
| `payments.refund` | P | Refund a charge |
| `payments.discounts.createCoupon` / `.updateCoupon` / `.deleteCoupon` | P | Stripe coupons |
| `payments.discounts.createPromoCode` / `.deactivatePromoCode` | P | Stripe promo codes |
| `payments.webhook.stripe` **(event)** | P | Inbound Stripe webhook (forwarded raw from gateway) |

For how the gateway authenticates each request (introspection, caching,
`x-client-key`), see the [Identity & Auth flow](/architecture/auth/).
