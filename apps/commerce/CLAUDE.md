# Commerce App (Store Admin UI)

Next.js 15 admin UI for store owners. Port 3004. Active development on `release/commerce-v2`.

Connects to **sitehaus-commerce** gateway at `commerce-api.localhost` (:7020). Auth delegates to IAM via token introspection.

## Key Points

- Same React/Next standards as dashboard (see `apps/dashboard/CLAUDE.md`) — one component per file, React Query, thin page files
- All pages are `"use client"`
- Store context resolved from URL slug: `app/[storeSlug]/`
- `["store"]` query key caches `getMyStore()` — used in settings, orders, order detail for `fulfillmentType`

## Structure

```
app/
  [storeSlug]/      ← all authenticated store routes
    orders/
    products/
    collections/
    settings/
  login/            ← store login
  callback/         ← OAuth callback
  providers/        ← auth + query client
```

## Commerce API Standards

See `docs/standards/api.md` for NestJS patterns used in sitehaus-commerce (contracts, controllers, services, TCP handlers).
