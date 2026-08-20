# Store Onboarding Flow — Design

**Date:** 2026-08-20
**Repos:** `sitehaus-commerce` (backend), `sitehaus` (`apps/commerce` admin UI)
**Tickets:** SIT-266 (parent), SIT-272 (shipping-zone gate), SIT-273 (Stripe messaging), SIT-274
(tax checkpoint), SIT-275 (deferred — see Non-goals)
**Status:** approved, not yet planned

## Problem

OneHealth went live as a `fulfillmentType: "shipping"` store with zero rows in `shipping_zones`.
Checkout still worked — it just silently charged $0 shipping — for an unknown stretch of time,
until it was caught by hand. Nothing in the platform would have surfaced that gap on its own.

The underlying issue: **going live and being ready to go live are not the same state, and nothing
checks the difference.** Stripe Connect is the one exception — `intent.service.ts` already refuses
to create a checkout session if the store has no Stripe account or `charges_enabled` is false.
Shipping zones and tax registration have no equivalent. A store can accept real payments today
having never configured either.

## Goals

1. A shipping-fulfillment store cannot process a real payment with zero shipping zones configured.
2. A store cannot process a real payment before someone has explicitly answered the tax
   registration question — not skipped it, not defaulted past it.
3. Do this without breaking checkout for the three stores already live in production (OneHealth,
   Camo, Nayadnara).
4. Give whoever's onboarding a client (Parker/Ethan, not the client) one place to see what's
   missing before they ever point a domain at a new store.

## Non-goals

- A guided, client-facing setup wizard. This is an internal tool — you or Ethan configure
  Stripe/zones/tax on the client's behalf today, and that doesn't change here. (Ruled out during
  design; a wizard was the original shape of SIT-266 before scoping this down.)
- Replacing `scripts/provision-onehealth.ts`-style per-client scripts (SIT-275). That's a real
  piece of work but a separate one — this spec only adds the gate and the checklist UI, it doesn't
  touch how a store gets created in the first place.
- Modeling real tax-registration state (which states, when, filed how). That's SIT-271. This spec
  adds one boolean checkpoint — "has this been looked at" — nothing more.
- New Stripe Connect enforcement. It's already there; this spec only makes it visible earlier (see
  Design §3).

## Design

### 1. No new store-lifecycle status

The temptation is a `status: draft | live` field on `stores`. Rejected — it's a second source of
truth that can drift from what's actually configured (a zone gets deleted, the flag doesn't know).
Instead this mirrors the existing Stripe check exactly: enforcement reads real data, fresh, on
every checkout attempt. If the underlying data is right, the gate passes. Nothing to keep in sync.

### 2. New field: `taxRegistrationConfirmed`

One column on `stores` (`packages/database/src/stores.ts`, sitehaus-commerce):

```ts
taxRegistrationConfirmed: boolean("tax_registration_confirmed").notNull().default(false),
```

Deliberately a boolean, not an enum trying to model "registered in which states." That question
belongs to SIT-271. This field only answers "has a human been forced to look at this before the
store went live" — which is the actual gap OneHealth exposed (nobody ever asked).

### 3. Enforcement: extend the existing checkout guard

`apps/payments/src/intent/intent.service.ts` already throws `RpcException 400` if
`store.stripeAccountId` is missing, before it will create a checkout session. Add two more checks
to the same guard, same style:

```ts
if (order.fulfillmentType === "shipping") {
  const [zone] = await this.db
    .select({ id: shippingZonesTable.id })
    .from(shippingZonesTable)
    .where(eq(shippingZonesTable.storeId, store.id))
    .limit(1);
  if (!zone) {
    throw new RpcException({ status: 400, message: "Store shipping is not configured" });
  }
}

if (!store.taxRegistrationConfirmed) {
  throw new RpcException({ status: 400, message: "Store tax registration has not been confirmed" });
}
```

Same failure shape the Stripe check already produces — no new exception type, no new client-side
handling needed anywhere that already handles a failed checkout-session creation.

### 4. UI: a go-live checklist on the existing settings page

`apps/commerce/app/[storeSlug]/(admin)/settings/page.tsx` (sitehaus) gets one new `SectionCard` at
the top, reusing the file's existing `StatusRow` component:

- **Shipping zones** — derived, read-only. Green if ≥1 zone exists, links to `/shipping` if not.
- **Stripe connected** — derived, read-only. Reuses the `chargesEnabled`/`payoutsEnabled` data the
  Stripe section below it already fetches (SIT-273 — this is the "surface it earlier" fix; the
  enforcement already existed, it just wasn't visible until a checkout failed).
- **Tax registration** — the one manual entry. A "Mark as confirmed" button that `PATCH`es
  `taxRegistrationConfirmed: true` via the existing store-settings update endpoint. No further
  metadata (which states, when) — that's SIT-271's UI to build later.

Internal-only audience (confirmed during design) — labels are plain and direct, no client-facing
hand-holding copy.

### 5. Migration and rollout

The new column ships `notNull().default(false)`, which would immediately block checkout for every
store that already exists. The same migration includes a one-time backfill:

```sql
UPDATE stores SET tax_registration_confirmed = true
WHERE slug IN (/* pulled from a live prod query at write time, not hardcoded from memory */);
```

This is a grandfather clause, not a claim that OneHealth/Camo/Nayadnara have real tax registrations
on file — SIT-271 is what actually solves that. It exists purely so the new gate doesn't retroactively
break checkout for stores that were already trusted to go live under the old rules.

No shipping-zone backfill is needed — all three already have ≥1 zone configured.

**Before this merges:** pull the real list of currently-live stores from prod and confirm each one
actually has a working checkout today. The migration is vouching for that list; it should come
from a query, not from memory.

## User-facing impact

- **End shoppers on already-live stores (OneHealth, Camo, Nayadnara):** none. Grandfathered by the
  migration; checkout behaves identically before and after this ships.
- **Those three clients specifically:** nothing to do. The checklist is internal-only tooling they
  never see, and their row renders fully green on deploy day with no action from them or you.
- **You/Ethan, once:** verify the backfill list against prod before merging (§5).
- **Future clients:** this is where the gate actually does something. Any store onboarded after
  this ships cannot process a single real payment until shipping zones exist, Stripe is fully
  connected, and tax has been explicitly confirmed. If a new storefront goes public before that
  checklist is finished, a real shopper hitting checkout gets a hard, visible failure — not a
  silent $0-shipping order like OneHealth had, but not invisible either. That trade is the point:
  it converts "nobody notices until someone complains" into "checkout refuses to work," which
  forces the checklist to be finished before launch instead of discovered after.

## Failure modes

| Failure                                            | Behaviour                                                                                       |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Shipping store, zero zones, customer hits checkout | 400 "Store shipping is not configured" — same shape as the existing Stripe failure              |
| Tax not yet confirmed, customer hits checkout      | 400 "Store tax registration has not been confirmed"                                             |
| Pickup-fulfillment store, zero zones               | Zone check is skipped entirely — zones are meaningless for pickup                               |
| Zone existed, later deleted                        | Gate re-fails on the next checkout attempt — no stale "was live once" state to fall out of sync |

## Testing

- `intent.service.spec.ts`: throws 400 for a shipping-fulfillment store with zero zones; passes
  with ≥1 zone; throws 400 when `taxRegistrationConfirmed` is false; passes when true; a
  pickup-fulfillment store is never blocked by the zone check; existing Stripe-gate tests
  untouched.
- Settings page: checklist renders all three states correctly (pass/fail combinations); "Mark as
  confirmed" button PATCHes and the row updates.
- Migration: confirm the backfilled stores pass the new gate immediately post-migration in a
  staging run before it touches prod.

## Risks and honest limitations

- **This doesn't solve tax.** It only guarantees someone looked at the question before a store
  went live. Whether the answer they gave was correct is entirely on the human clicking the
  button, and still needs SIT-271 to become a real, checkable state.
- **A new client's checkout can fail loudly in production** if their storefront goes public before
  the checklist is finished. That's the intended trade (see User-facing impact above), but it does
  mean sequencing matters at launch time in a way it didn't before — publishing the domain and
  finishing the checklist are no longer independent of each other.
- **The grandfather list is a one-time trust decision, not a guarantee.** If OneHealth's actual tax
  posture is wrong, this spec doesn't detect that — it explicitly punts that to SIT-271.
