# Customer Address Minimization — Design

**Date:** 2026-07-14
**Repos:** `sitehaus-commerce` (backend), `sitehaus` (`apps/commerce` admin UI)
**Findings addressed:** F-060, F-061 (and partially F-063, F-064)
**Status:** approved, not yet planned

## Problem

SiteHaus is the sole custodian of every customer's home address, forever.

`checkout.service.ts` writes the full shipping address into `orders`
(`shipping_name/line1/line2/city/state/zip/country`). All 95 orders in the dev database have
one; OneHealth's production orders likewise. Nothing ever removes them.

Stripe never sees the address at all — `intent.service.ts` creates the PaymentIntent with no
`shipping` object — so we hold data a hardened payment processor could hold for us, and we
forfeit a Stripe Radar fraud signal in the process.

The address itself is not the problem. It is the minimum needed to ship a physical good, and
removing it outright would break checkout, three transactional emails, refunds, the admin order
page, and make the planned label integration impossible. **The problem is unbounded retention and
sole custody.**

## Goals

1. No customer street addresses in our database, beyond a bounded dispute window.
2. Do not break checkout, order emails, order display, or the forthcoming label purchase.
3. Do not damage OneHealth's ability to defend a chargeback.

## Non-goals

- Removing the customer's city/state/zip/country. These drive shipping-zone pricing, tax, and
  analytics, and name + city is dramatically less identifying than name + street.
- Erasure/DSAR tooling (F-064) or the Resend/`notification_logs` copies (F-063). Logged, deferred.
- Anything to do with buying shipping labels. That is the next spec, and it depends on this one.

## Design

### 1. The street never reaches Postgres

The storefront still collects the full address and posts it to our API. From there:

- `checkout.service.ts` **stops persisting `shippingLine1` / `shippingLine2`**.
- It continues to persist `shippingName`, `shippingCity`, `shippingState`, `shippingZip`,
  `shippingCountry`.
- The street travels from the checkout request, through the TCP call, into
  `payments.createIntent`, which sets it on the PaymentIntent:

```ts
stripe.paymentIntents.create({
  // …
  shipping: {
    name,
    address: { line1, line2, city, state, postal_code: zip, country },
  },
});
```

The ordering matters and is the one genuinely fiddly part: we create the `pending` order **before**
the PaymentIntent. So the street cannot be read back out of the order row — it must be threaded
through the call explicitly. It lives in memory for the length of one request and is never written
to Postgres.

Setting `shipping` also restores the Radar fraud signal (F-061), which is worth doing on its own
merits regardless of where the data ends up living.

### 2. Reading the street back

New payments method: `getShippingAddress(orderId)` → reads the PaymentIntent, returns the street.

Three callers, all latency-tolerant, none on a customer-facing hot path:

| Caller                                         | Path                | Tolerance                                            |
| ---------------------------------------------- | ------------------- | ---------------------------------------------------- |
| Admin order detail                             | gateway → payments  | Admin-initiated; a spinner is fine                   |
| Order emails (confirmed / shipped / delivered) | worker → payments   | BullMQ job, already retried with exponential backoff |
| Buy label (next spec)                          | commerce → payments | Admin-initiated                                      |

**No caching.** Caching a street address is storing it again with extra steps.

The confirmation email must keep printing the full address — that is how a customer catches their
own typo before the parcel ships. It is not decoration and must not be dropped.

### 3. The legacy rows, and retention

`shipping_line1` / `shipping_line2` **remain as nullable columns**. Two reasons:

- Stripe will not let us set `shipping` on an already-succeeded PaymentIntent, so the 95 existing
  orders **cannot** be backfilled into Stripe. Their addresses have nowhere else to go.
- Keeping the columns makes the whole change reversible.

A worker cron then redacts the street on orders **past the dispute window**:

```
UPDATE orders SET shipping_line1 = NULL, shipping_line2 = NULL
WHERE created_at < now() - interval '120 days'
  AND (shipping_line1 IS NOT NULL OR shipping_line2 IS NOT NULL)
```

120 days ≈ the Stripe chargeback window. **Redacting sooner would cost a store a dispute it would
otherwise win** — chargeback defence requires showing you shipped to the address the customer
supplied. This is why the policy is "redact after the dispute window closes", not "delete on
delivery".

Legacy rows age out on their own. New orders never populate the columns at all. Once the columns are
provably empty, dropping them is a trivial follow-up migration — deliberately _not_ part of this
spec.

### 4. Failure modes

| Failure                                          | Behaviour                                                                              |
| ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Stripe down, admin views an order                | Render name/city/state/zip; show the street as unavailable. Never fail the whole page. |
| Stripe down, email job runs                      | BullMQ retries with backoff. A blip delays a receipt; it does not lose one.            |
| Stripe down at checkout                          | Unchanged — PaymentIntent creation already fails today.                                |
| PaymentIntent has no `shipping` (a legacy order) | Fall back to the columns, which still hold it until redaction.                         |

That last row is what makes this safe to deploy: old and new orders both render correctly
throughout the transition.

## Testing

The redaction job **destroys data irreversibly**, so it gets the strongest treatment:

- **DB-level integration test** (real Postgres, like the variations reconcile): proves it nulls only
  orders past the window and leaves recent ones untouched.
- **Dry-run mode** that reports what it _would_ redact, so it can be pointed at production and
  inspected before it is ever allowed to write.

Unit level:

- `checkout.service` no longer persists `line1`/`line2`, still persists city/state/zip/country.
- `createIntent` sends a correctly-shaped `shipping` object to Stripe.
- `getShippingAddress` returns the street from the PaymentIntent.
- The legacy fallback: an order whose PaymentIntent has no `shipping` still renders its street.

## Risks and honest limitations

- **This reduces breach surface, not legal obligation.** SiteHaus remains the data controller. A
  deletion request would still have to reach Stripe (and Resend). It is a security win, not a
  compliance escape hatch. (F-064)
- **It adds a Stripe dependency to order display and emails**, which touch only Postgres today.
  Mitigated by the fallbacks above, but it is a new failure mode on paths that previously had none.
- **The address still leaves the building.** The full street is rendered into emails and therefore
  transmitted to and retained by Resend, outside any policy we control. This spec does not fix that.
  (F-063)
- **We cannot un-ring the bell for the 95 legacy orders.** They keep their addresses until the
  dispute window closes.
