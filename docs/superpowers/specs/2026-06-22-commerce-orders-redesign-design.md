# Commerce Orders — Redesign + Abandoned-Checkout Cleanup

**Date:** 2026-06-22
**Status:** Approved design, pending spec review
**Apps touched:** `apps/commerce` (this repo), `packages/ui` (this repo), `sitehaus-commerce/apps/worker` (sibling repo)

## Problem

Store owners (e.g. OneHealth) believe they are receiving orders when they are not.
The commerce admin treats `pending` orders — Stripe payment intents that were
created at checkout but **never paid** — as first-class orders:

- The Orders hero counts them (`{total} orders` includes `pending`).
- The "All" tab lists them mixed in with real orders.
- The dashboard "Recent Orders" widget shows them newest-first.
- They are _also_ duplicated in a collapsed "Awaiting Payment" drawer.

In the current production data every visible row is "Awaiting Payment" with no
customer, dating back nearly two months — because **nothing ever expires a stale
`pending` order.** There is a `cart.expire` worker that deletes stale carts, but
no equivalent for abandoned payment intents, so they accumulate forever.

Mental model fix: an **order** exists only once payment is captured. A `pending`
record is an **abandoned checkout** and must never be counted or displayed as an
order.

## Goals

1. The Orders page and dashboard widget count and show **real orders only**
   (`confirmed`, `shipped`, `delivered`, `refunded`, `cancelled`). `pending` is
   surfaced only in a clearly-labelled, de-emphasised "Abandoned checkouts" drawer.
2. Replace the clunky tab strip with **stat cards that double as filters**, plus an
   **inline contextual action** (Ship / Mark collected) on each actionable row,
   driven by the existing confirmation dialog.
3. Re-skin the page to the **SiteHaus brand** (parchment + terracotta, Fraunces
   headings, warm clay shadows, JetBrains-mono IDs) using tokens that already
   exist in `apps/commerce/globals.css`. Stop hardcoding cool slate/amber/indigo.
4. Add a **worker job** that transitions stale `pending` orders → `cancelled`
   after 72h, so the abandoned pile drains on its own.

## Non-goals (explicitly deferred)

- Rewriting other commerce pages (products, collections, settings, inventory).
  They already consume the warm tokens and stay consistent untouched.
- Porting the look to `apps/dashboard` and `apps/iam`. The new primitives are
  built in `@site-haus/ui` so those apps can adopt later, but that is a separate,
  per-app effort and out of scope here.
- Any change to the checkout / payment-intent creation flow.
- An abandoned-checkout recovery email campaign (a `abandoned-cart.handler.ts`
  already exists; not touched here).

---

## Part A — Frontend redesign (`apps/commerce`)

### Layout (top → bottom)

1. **Header row.** Eyebrow "Store" + Fraunces "Orders" title + subtitle
   (`{n} active · {n} delivered this month`). Right-aligned **Revenue** block:
   eyebrow + shadcn-chart sparkline (recharts) + Fraunces figure + sage trend %.
2. **Filter stat cards** (replaces the tab strip). A responsive row:
   - `Needs action` (terracotta, alert styling) — paid orders awaiting fulfilment
     (shipping stores: `confirmed`; pickup stores: `confirmed`). Active by default.
   - `Paid`, `Shipped`, `Delivered` — each with a status dot in the brand colour.
   - Clicking a card sets the table filter (replaces `status` tab state). The
     active card gets the terracotta gradient + ring.
   - A small overflow control (or extra quiet cards) exposes `Refunded` /
     `Cancelled` so they remain reachable.
3. **Orders table** — real orders only. Columns: Order (mono ID), Customer
   (avatar + email), Status (`StatusPill`), Items, Total, Date, and a trailing
   **contextual action** column:
   - shipping store + `confirmed` row → **Ship →** button → opens existing ship
     dialog (tracking number + "Confirm & notify buyer").
   - pickup store + `confirmed` row → **Mark collected** button → `collectOrder`.
   - all other statuses → no action button.
   - Email search and pagination are retained.
4. **Abandoned checkouts drawer** — the existing collapsed section, restyled:
   dashed border, muted, count badge, label "Abandoned checkouts · never paid —
   auto-cleaned, not counted as orders." Lists `pending` rows. Collapsed by default.

### Data / behaviour changes

- **Hero count + subtitle:** derived from real-order statuses only, never `pending`.
- **"All"/default table query:** must exclude `pending`. Since `listOrders`
  filters by a single `status`, add support for either an `excludeStatus` or a
  multi-status filter on the contract, OR default the page to the `Needs action`
  card (not "all") and treat the card filters as the only entry points.
  **Preferred** (confirm the smaller change during planning — see open item 1):
  add a `statuses?: OrderStatus[]` option to the `listOrders` contract/query so
  "All real orders" = all statuses except `pending`. The contract lives in
  `sitehaus-commerce/packages/validation` + gateway; it is a small additive change.
- **`recent-orders.tsx` (dashboard home):** same exclusion — query real orders
  only; restyle to brand.
- **Revenue figure:** sum of `totalCents` for paid+ orders in the current month.
  If no existing endpoint returns this, derive from the confirmed-orders query the
  page already runs, or add a light summary field. (Flag during planning — may be
  a follow-up if no cheap source exists; the figure is presentation, not core.)

### Status taxonomy → brand tokens

Restyle `order-status-badge.tsx` (used by orders page + recent-orders) to brand
tokens instead of hardcoded Tailwind:

| Status      | Label          | Brand colour                 |
| ----------- | -------------- | ---------------------------- |
| `pending`   | Abandoned      | muted/dashed (drawer only)   |
| `confirmed` | Paid           | warm gold                    |
| `shipped`   | Shipped        | rose                         |
| `delivered` | Delivered      | sage                         |
| `failed`    | Payment failed | destructive (terracotta-600) |
| `refunded`  | Refunded       | clay                         |
| `cancelled` | Cancelled      | muted                        |

### Components — reuse shadcn/ui first

`@site-haus/ui` already ships the relevant shadcn base components (`card`,
`badge`, `avatar`, `chart`, `collapsible`, `dialog`, `table`, `tabs`) and
`recharts@2.15.4` is already a dependency in both `packages/ui` and
`apps/commerce`. **Compose these rather than hand-roll.** Map of needs → existing
component:

| Need                      | Use                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| Customer avatar           | existing `base/avatar.tsx`                                                                                |
| Status pill               | existing `base/badge.tsx` (`variant="outline"` + brand-tone class)                                        |
| Revenue sparkline / trend | existing `base/chart.tsx` (shadcn `ChartContainer` + recharts `Area`/`Line`); colours from `--chart-1..5` |
| Abandoned drawer          | existing `base/collapsible.tsx`                                                                           |
| Ship confirm              | existing `base/dialog.tsx` (already in use)                                                               |

Only **one genuinely new shared piece** — built generically in `@site-haus/ui`
so dashboard/IAM can adopt later:

- **`StatCard`** — thin composition over `base/card.tsx`:
  `{ label, value, dotColor?, active?, alert?, onClick? }`. Warm card, hover lift,
  active terracotta state, Fraunces value. Token-driven; no hardcoded hex.

`StatusPill` is **not** a new component — it is a small set of brand-tone classes
applied to the existing `Badge` (replacing the hardcoded amber/blue/purple config
in `order-status-badge.tsx`). The revenue sparkline uses the shadcn chart, not a
custom SVG.

### Fonts

`apps/commerce` layout must load **Fraunces** (display), **Inter Tight** (body),
**JetBrains Mono** (mono) and expose them as `--font-display/-body/-mono`,
mirroring `apps/web/app/layout.tsx`. Headings/Fraunces helpers reused from the
shared style layer where possible.

---

## Part B — Worker cleanup (`sitehaus-commerce/apps/worker`)

### Job: `order.expire`

- **Queue:** `ecom-orders` (same queue as `cart.expire`).
- **Schedule:** registered in `apps/worker/src/main.ts` as a repeatable job,
  daily, mirroring `cart.expire` (`pattern: "0 3 * * *"` or a dedicated slot,
  e.g. `"15 3 * * *"` to avoid colliding). `removeOnComplete: 5, removeOnFail: 10`.
- **Processor:** new `OrderExpireProcessor` (`@Processor("ecom-orders")`,
  `WorkerHost`) that returns early unless `job.name === "order.expire"`, mirroring
  `CartExpireProcessor`. (A separate WorkerHost on the same queue is the existing
  pattern — each checks `job.name`.)
- **Action:** transition `pending` orders older than **72h** to `cancelled`
  (soft — keeps the row for audit, reuses the existing enum, and is automatically
  excluded from order views). Batch with `LIMIT` like `cart.expire`. Log the count.

  ```sql
  UPDATE orders
  SET status = 'cancelled', updated_at = now()
  WHERE id IN (
    SELECT id FROM orders
    WHERE status = 'pending' AND created_at < now() - interval '72 hours'
    LIMIT 200
  )
  ```

- Optionally cancel the corresponding Stripe PaymentIntent if still open — flagged
  for planning; not required for the UI fix and may be a follow-up. Default: DB
  status transition only.

---

## Data flow

```
Checkout → order(status=pending, stripePaymentIntentId)
   │
   ├─ payment succeeds → webhook → status=confirmed   ──► shows as a real order
   │
   └─ never paid → sits pending
                      │
                      └─ worker order.expire (>72h) → status=cancelled
                                                         (drops out of all order views)

Admin Orders page:
   real orders  = statuses ≠ pending  → hero count, stat cards, table
   pending      = abandoned drawer only (de-emphasised, never counted)
```

## Error handling

- Worker job: wrap in try/catch, log failures, `removeOnFail` retains a few for
  inspection. Idempotent (status filter means already-cancelled rows aren't
  re-touched).
- Frontend: existing React Query error toasts for ship/collect retained. If the
  revenue/summary source is unavailable, the figure degrades gracefully (hidden or
  "—") without breaking the page.

## Testing

- **Worker:** unit test `OrderExpireProcessor` mirroring `cart-expire.processor.spec.ts`
  — seeds `pending` rows older/newer than 72h, asserts only stale ones flip to
  `cancelled`, asserts non-`pending` untouched. (Tests-first per the API
  decomposition decision.)
- **Frontend:** verify hero count excludes pending; "All"/default view excludes
  pending; abandoned drawer lists pending; ship/collect actions appear only on
  `confirmed` rows per `fulfillmentType`; status pills render brand tones.
- **Visual:** manual check in light + dark mode against the approved mockup.

## Files touched (anticipated)

**`apps/commerce`**

- `app/[storeSlug]/(admin)/orders/page.tsx` — rewrite layout
- `app/[storeSlug]/(admin)/orders/_components/order-status-badge.tsx` — brand tones (or replace with `StatusPill`)
- `app/[storeSlug]/(admin)/_components/recent-orders.tsx` — exclude pending + restyle
- `app/layout.tsx` — load Fraunces / Inter Tight / JetBrains Mono
- `lib/commerce.ts` — `listOrders` multi-status support (if contract updated)

**`packages/ui`**

- new `StatCard` component (composition over existing `card.tsx`) + export
- reuse existing `avatar`, `badge`, `chart`, `collapsible`, `dialog` — no new files

**`sitehaus-commerce`**

- `apps/worker/src/processors/order-expire.processor.ts` (new) + spec
- `apps/worker/src/app.module.ts` — register processor
- `apps/worker/src/main.ts` — register repeatable `order.expire` job
- `packages/validation` + gateway contract — `statuses?: OrderStatus[]` on list orders (if chosen)

## Open items to resolve during planning

1. **List-orders multi-status filter** vs. defaulting the page to card-driven
   queries — pick the smaller contract change.
2. **Revenue figure source** — reuse existing query vs. add a summary field vs.
   defer the figure to a follow-up.
3. **Stripe PaymentIntent cancellation** in the worker — include or defer.
