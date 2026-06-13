---
title: Commerce — Admin UI
description: Page-by-page inventory of the store admin app (sitehaus/apps/commerce, :3004) and the gateway endpoints it calls.
---

The commerce **admin UI** is a Next.js 15 app living in the *sitehaus* monorepo at
`apps/commerce` (port 3004, `commerce.localhost`) — **not** in the
`sitehaus-commerce` repo. Every page is `"use client"`. Auth delegates to IAM via
the OAuth/PKCE flow (client_key `sitehaus-commerce-admin`, see the
[auth flow](/architecture/auth/)); data is fetched through React Query.

## API client

All calls go through one hand-written fetch wrapper:
`sitehaus/apps/commerce/lib/commerce.ts`. The `request()` helper pulls
`accessToken` and `managedClientId` from the shared `@site-haus/stores`
`auth-store` and sends:

- `Authorization: Bearer <IAM access token>`
- `x-client-id: <managedClientId>` when a first-party operator is managing a
  specific store (maps to the gateway's `AdminStoreGuard` override).

The file exports ~60 typed functions (e.g. `getMyStore`, `listProducts`,
`refundOrder`, `getImageUploadUrl`) — each a thin wrapper over a `/v1/admin/...`
gateway route. Types (`StoreDetail`, `ProductDetail`, `FulfillmentType`, etc.) are
hand-maintained in this same file, not imported from `@sitehaus-ecom/contracts`.

### The `["store"]` query-key pattern

`getMyStore()` (→ `GET /v1/admin/stores/me`) is cached under the React Query key
`["store"]` and reused across the **settings**, **orders** list, and **order
detail** pages — primarily to read `fulfillmentType` (which decides whether the
order action is "ship" vs "collect"). Confirmed in
`orders/page.tsx`, `orders/[id]/page.tsx`, and `settings/page.tsx`.

## Pages

Routes live under `app/[storeSlug]/(admin)/`. The store slug is the URL segment;
the gateway nonetheless resolves the real store from the bearer token, so the slug
is mostly cosmetic for admin routes.

| Route | Manages | Gateway endpoints called | Query / state notes |
| ----- | ------- | ------------------------ | ------------------- |
| `/(admin)` (dashboard) | Store overview / KPIs | analytics + orders reads | landing view |
| `/products` | Product list | `GET /v1/admin/products` | key `["products", status, offset]` — status filter + pagination |
| `/products/new` | Create product | `POST /v1/admin/products` | mutation → redirect to detail |
| `/products/[id]` | Product detail: variants, options, images | `GET/PATCH /v1/admin/products/:id`; variants, options, option-values, and `images/upload-url` + `images/confirm` (R2) | image upload = presigned PUT to R2 then confirm |
| `/collections` | Collection list + create/delete | `GET /v1/admin/collections`, `POST`, `DELETE /:id` | key `["collections"]`; `createCollection`/`deleteCollection` mutations |
| `/collections/[id]` | Collection detail + product ordering | `GET /v1/admin/collections/:id`, `POST /:id/products`, `POST /:id/reorder` | reorder via drag |
| `/inventory` | Stock levels, low/out counts, adjust | `GET /v1/admin/inventory`, `GET/PATCH /v1/admin/inventory/:variantId` | keys `["inventory","list",filter,page]`, `["inventory","count","low"]`, `["inventory","count","out"]` |
| `/orders` | Order list + action queue (ship/collect) | `GET /v1/admin/orders`, `PATCH /:id/ship`, `POST /:id/collect` | keys `["orders", ...]`, `["orders","confirmed-queue"]`, `["store"]`; invalidates `["orders"]` after mutations |
| `/orders/[id]` | Order detail, ship/collect/refund | `GET /v1/admin/orders/:id`, `PATCH /:id/ship`, `POST /:id/collect`, `POST /:id/refund` | reads `["store"]` for `fulfillmentType` |
| `/shipping` | Zones & rates CRUD | `GET/POST /v1/admin/shipping/zones`, `PATCH/DELETE /zones/:id`, `.../rates...` | key `["shipping-zones"]`; `listShippingZones` |
| `/webhooks` | Outbound webhook endpoints + deliveries | `GET/POST /v1/admin/webhooks`, `PATCH/DELETE /:id`, `GET /:id/deliveries` | key `["webhook-endpoints"]`; `listWebhookEndpoints` |
| `/analytics` | Revenue, top products, funnel, abandoned carts | `GET /v1/admin/analytics/revenue`, `/top-products`, `/funnel`, `/abandoned-carts`, `/abandoned-carts/list` | date-range driven |
| `/settings` | Store settings + Stripe Connect | `GET /v1/admin/stores/me`, `PATCH /v1/admin/stores`, `POST /v1/admin/stores/connect-stripe`, `GET /v1/admin/stores/stripe-status` | keys `["store"]`, `["stripe-status"]`; connect-stripe returns onboarding URL |

The patterns match the dashboard app's conventions (one component per file, thin
page files dispatching to `_components/`, React Query with `useQuery`/`useMutation`
and `queryClient.invalidateQueries`), as claimed in
`sitehaus/apps/commerce/CLAUDE.md`.
