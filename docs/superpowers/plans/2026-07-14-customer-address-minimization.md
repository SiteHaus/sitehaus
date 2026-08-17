# Customer Address Minimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop persisting customer street addresses in our database — Stripe becomes the system of record — without breaking checkout, order emails, order display, or the 95 legacy orders.

**Architecture:** The gateway's `checkout.controller.ts` already holds the full address in memory. Today it forwards the street to `commerce.createOrder`, which writes it to Postgres. We reroute it: the street goes to `payments` instead, which attaches it to the Stripe Checkout Session (`payment_intent_data.shipping`) and therefore to the PaymentIntent. The street then never enters the commerce service or the database. Anything that later needs it (admin order page, the three order emails, and — in a future spec — buying a shipping label) asks payments for it via a new `stripe.shipping.get` TCP message. Legacy orders keep their columns until a redaction cron clears them past the 120-day dispute window.

**Tech Stack:** NestJS 11 (TCP microservices), Drizzle ORM, Postgres, BullMQ, Stripe (Checkout Sessions), Jest, Next.js 15 (admin UI).

**Spec:** `docs/superpowers/specs/2026-07-14-customer-address-minimization-design.md`

## Global Constraints

- **Commit messages:** short, one line, conventional-commit prefix. **NEVER add a `Co-Authored-By` trailer.**
- **Staging:** always `git add` explicit paths. Never `git add -A`, `git add .`, or a bare directory.
- **Repos:** backend tasks are in `~/Dev/sitehaus-commerce`. Task 9 only is in `~/Dev/sitehaus`.
- **Dispute window is 120 days.** Redacting sooner destroys a store's chargeback defence. This value is load-bearing — do not "round it" to 90 or 100.
- **Legacy orders must keep working throughout.** Every read path falls back to `orders.shipping_line1/line2` when the PaymentIntent has no `shipping`. An order placed before this change must still render its street and still send a correct receipt.
- **A missing street must never fail a page or lose an email.** Return nulls, log a warning, degrade — never throw.
- **Never cache or re-persist the street.** Caching it is storing it again with extra steps. It may live in memory for the length of one request and nowhere else.
- **Keep persisting** `shippingName`, `shippingCity`, `shippingState`, `shippingZip`, `shippingCountry`. Only `line1`/`line2` stop being written.
- **Do not drop the `shipping_line1` / `shipping_line2` columns.** They stay nullable, holding legacy data until redaction. Dropping them is a separate follow-up.

## Interfaces Established By This Plan

Names later tasks depend on — use these exactly:

```ts
// Task 1 — apps/payments/src/intent/intent.service.ts
type ShippingInput = {
  name?: string; line1?: string; line2?: string;
  city?: string; state?: string; zip?: string; country?: string;
};
createIntent(orderId, successUrl, cancelUrl, cartId?, stripeCouponId?, shipping?: ShippingInput)

// Task 2 — apps/payments/src/shipping-address/shipping-address.service.ts
export type ShippingStreet = { line1: string | null; line2: string | null };
class ShippingAddressService { getShippingStreet(orderId: string): Promise<ShippingStreet> }
// TCP message pattern: "stripe.shipping.get"  payload: { orderId: string }

// Task 5 — apps/worker/src/processors/handlers/get-shipping-street.ts
export async function getShippingStreet(
  ctx: HandlerContext,
  order: { id: string; shippingLine1: string | null; shippingLine2: string | null },
): Promise<ShippingStreet>;
```

---

### Task 1: Attach the street to the Stripe Checkout Session

The PaymentIntent is created _by_ the Checkout Session, so we set `payment_intent_data.shipping` rather than calling `paymentIntents.create`. Stripe requires **both** `name` and `address.line1` — if either is missing we must omit `shipping` entirely or Stripe 400s.

**Files:**

- Modify: `apps/payments/src/intent/intent.service.ts` (signature ~line 29; `sessions.create` ~line 150)
- Modify: `apps/payments/src/intent/intent.handler.ts`
- Test: `apps/payments/src/intent/intent.service.spec.ts` (create if absent)

**Interfaces:**

- Consumes: nothing
- Produces: `createIntent(..., shipping?: ShippingInput)` and the TCP payload field `shipping` on `stripe.intent.create`

- [ ] **Step 1: Write the failing test**

Create/extend `apps/payments/src/intent/intent.service.spec.ts`. Mock Stripe; assert on what we hand `sessions.create`.

```ts
it("puts the street on the PaymentIntent, never in our DB", async () => {
  await service.createIntent("order-1", "https://s", "https://c", undefined, null, {
    name: "Ada Lovelace",
    line1: "12 Baker St",
    line2: "Flat 4",
    city: "Provo",
    state: "UT",
    zip: "84604",
    country: "US",
  });

  const params = sessionsCreate.mock.calls[0][0];
  expect(params.payment_intent_data.shipping).toEqual({
    name: "Ada Lovelace",
    address: {
      line1: "12 Baker St",
      line2: "Flat 4",
      city: "Provo",
      state: "UT",
      postal_code: "84604",
      country: "US",
    },
  });
});

it("omits shipping when there is no line1 — Stripe rejects a partial address", async () => {
  await service.createIntent("order-1", "https://s", "https://c", undefined, null, {
    name: "Ada Lovelace",
    city: "Provo",
  });
  expect(sessionsCreate.mock.calls[0][0].payment_intent_data.shipping).toBeUndefined();
});

it("omits shipping entirely when the caller passes none (legacy callers)", async () => {
  await service.createIntent("order-1", "https://s", "https://c");
  expect(sessionsCreate.mock.calls[0][0].payment_intent_data.shipping).toBeUndefined();
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm --filter @sitehaus-ecom/payments test -- intent.service`
Expected: FAIL — `payment_intent_data.shipping` is `undefined` (we never set it).

- [ ] **Step 3: Add the parameter**

In `apps/payments/src/intent/intent.service.ts`, extend the signature:

```ts
  async createIntent(
    orderId: string,
    successUrl: string,
    cancelUrl: string,
    cartId?: string,
    stripeCouponId?: string | null,
    shipping?: {
      name?: string;
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
    },
  ): Promise<{ checkoutUrl: string }> {
```

- [ ] **Step 4: Set it on the session**

Replace the existing `payment_intent_data` block inside `this.stripe.checkout.sessions.create({...})`:

```ts
        payment_intent_data: {
          transfer_data: { destination: store.stripeAccountId },
          metadata: { orderId: order.id, storeId: order.storeId },
          // Stripe is the system of record for the street — it is deliberately never written
          // to our DB (see the address-minimization spec). Stripe requires BOTH name and
          // line1: a partial address is a 400, so send all of it or none of it.
          ...(shipping?.name && shipping.line1
            ? {
                shipping: {
                  name: shipping.name,
                  address: {
                    line1: shipping.line1,
                    ...(shipping.line2 ? { line2: shipping.line2 } : {}),
                    ...(shipping.city ? { city: shipping.city } : {}),
                    ...(shipping.state ? { state: shipping.state } : {}),
                    ...(shipping.zip ? { postal_code: shipping.zip } : {}),
                    ...(shipping.country ? { country: shipping.country } : {}),
                  },
                },
              }
            : {}),
        },
```

- [ ] **Step 5: Pass it through the TCP handler**

In `apps/payments/src/intent/intent.handler.ts`:

```ts
  @MessagePattern("stripe.intent.create")
  createIntent(
    @Payload()
    payload: {
      orderId: string;
      cartId?: string;
      successUrl: string;
      cancelUrl: string;
      stripeCouponId?: string | null;
      shipping?: {
        name?: string;
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        zip?: string;
        country?: string;
      };
    },
  ) {
    return this.intent.createIntent(
      payload.orderId,
      payload.successUrl,
      payload.cancelUrl,
      payload.cartId,
      payload.stripeCouponId ?? null,
      payload.shipping,
    );
  }
```

- [ ] **Step 6: Run tests**

Run: `pnpm --filter @sitehaus-ecom/payments test`
Expected: PASS, all suites.

- [ ] **Step 7: Commit**

```bash
git add apps/payments/src/intent/intent.service.ts apps/payments/src/intent/intent.handler.ts apps/payments/src/intent/intent.service.spec.ts
git commit -m "feat(payments): carry the shipping street on the checkout session"
```

---

### Task 2: Read the street back out of Stripe

**Files:**

- Create: `apps/payments/src/shipping-address/shipping-address.service.ts`
- Create: `apps/payments/src/shipping-address/shipping-address.handler.ts`
- Create: `apps/payments/src/shipping-address/shipping-address.module.ts`
- Create: `apps/payments/src/shipping-address/shipping-address.service.spec.ts`
- Modify: `apps/payments/src/app.module.ts` (add `ShippingAddressModule` to `imports`)

**Interfaces:**

- Consumes: Task 1's `shipping` on the PaymentIntent
- Produces: `ShippingStreet`, `ShippingAddressService.getShippingStreet(orderId)`, TCP pattern `stripe.shipping.get`

- [ ] **Step 1: Write the failing test**

`apps/payments/src/shipping-address/shipping-address.service.spec.ts`:

```ts
it("returns the street from the PaymentIntent", async () => {
  dbFindFirst.mockResolvedValue({ stripePaymentIntentId: "pi_1" });
  retrieve.mockResolvedValue({ shipping: { address: { line1: "12 Baker St", line2: "Flat 4" } } });

  await expect(service.getShippingStreet("order-1")).resolves.toEqual({
    line1: "12 Baker St",
    line2: "Flat 4",
  });
});

it("returns nulls for a legacy order whose PI has no shipping", async () => {
  dbFindFirst.mockResolvedValue({ stripePaymentIntentId: "pi_old" });
  retrieve.mockResolvedValue({ shipping: null });

  await expect(service.getShippingStreet("order-1")).resolves.toEqual({ line1: null, line2: null });
});

it("returns nulls (never throws) when Stripe is down — a page must not die over a street", async () => {
  dbFindFirst.mockResolvedValue({ stripePaymentIntentId: "pi_1" });
  retrieve.mockRejectedValue(new Error("stripe is down"));

  await expect(service.getShippingStreet("order-1")).resolves.toEqual({ line1: null, line2: null });
});

it("returns nulls when the order has no PaymentIntent at all", async () => {
  dbFindFirst.mockResolvedValue({ stripePaymentIntentId: null });
  await expect(service.getShippingStreet("order-1")).resolves.toEqual({ line1: null, line2: null });
  expect(retrieve).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm --filter @sitehaus-ecom/payments test -- shipping-address`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the service**

`apps/payments/src/shipping-address/shipping-address.service.ts`:

```ts
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { eq, ordersTable, type Db } from "@sitehaus-ecom/database";
import { DB_TOKEN } from "@sitehaus-ecom/shared";
import Stripe from "stripe";

export type ShippingStreet = { line1: string | null; line2: string | null };

@Injectable()
export class ShippingAddressService {
  private readonly logger = new Logger(ShippingAddressService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly config: ConfigService,
    @Inject(DB_TOKEN) private readonly db: Db,
  ) {
    this.stripe = new Stripe(config.getOrThrow("STRIPE_SECRET_KEY"));
  }

  /**
   * The street lives on the PaymentIntent, not in our database.
   *
   * Returns nulls rather than throwing, always. An unavailable street must never fail an
   * order page or lose a receipt — the caller degrades instead. Legacy orders (placed before
   * we started sending `shipping` to Stripe) have no shipping on their PI; they come back
   * null here and the caller falls back to the columns, which still hold their street until
   * redaction.
   */
  async getShippingStreet(orderId: string): Promise<ShippingStreet> {
    const order = await this.db.query.ordersTable.findFirst({
      where: eq(ordersTable.id, orderId),
      columns: { stripePaymentIntentId: true },
    });
    if (!order?.stripePaymentIntentId) return { line1: null, line2: null };

    try {
      const pi = await this.stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
      return {
        line1: pi.shipping?.address?.line1 ?? null,
        line2: pi.shipping?.address?.line2 ?? null,
      };
    } catch (err: any) {
      this.logger.warn(`Stripe shipping lookup failed for order ${orderId}: ${err.message}`);
      return { line1: null, line2: null };
    }
  }
}
```

- [ ] **Step 4: Write the handler and module**

`apps/payments/src/shipping-address/shipping-address.handler.ts`:

```ts
import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { ShippingAddressService } from "./shipping-address.service";

@Controller()
export class ShippingAddressHandler {
  constructor(private readonly shippingAddress: ShippingAddressService) {}

  @MessagePattern("stripe.shipping.get")
  getShippingStreet(@Payload() payload: { orderId: string }) {
    return this.shippingAddress.getShippingStreet(payload.orderId);
  }
}
```

`apps/payments/src/shipping-address/shipping-address.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { ShippingAddressHandler } from "./shipping-address.handler";
import { ShippingAddressService } from "./shipping-address.service";

@Module({
  controllers: [ShippingAddressHandler],
  providers: [ShippingAddressService],
})
export class ShippingAddressModule {}
```

Then add `ShippingAddressModule` to the `imports` array in `apps/payments/src/app.module.ts` (alongside `IntentModule`, `RefundModule`, etc.), with the matching import statement.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @sitehaus-ecom/payments test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/payments/src/shipping-address/ apps/payments/src/app.module.ts
git commit -m "feat(payments): stripe.shipping.get reads the street off the PaymentIntent"
```

---

### Task 3: Reroute the street at the gateway

This is the task that actually stops the street reaching Postgres. The gateway already has it in `body.address` — we simply stop forwarding it to commerce and forward it to payments instead.

**Files:**

- Modify: `apps/gateway/src/checkout/checkout.controller.ts:31-33` (drop line1/line2) and `:51-57` (add `shipping`)
- Test: `apps/gateway/src/checkout/checkout.controller.spec.ts`

**Interfaces:**

- Consumes: Task 1's `shipping` payload field on `stripe.intent.create`
- Produces: `checkout.createOrder` payload no longer carries `shippingLine1` / `shippingLine2`

- [ ] **Step 1: Write the failing test**

In `apps/gateway/src/checkout/checkout.controller.spec.ts`:

```ts
it("sends the street to payments and NOT to commerce", async () => {
  await controller.createIntent(req).then((h) => h({ body: fullCheckoutBody }));

  const createOrderPayload = commerceSend.mock.calls.find(
    ([pattern]) => pattern === "checkout.createOrder",
  )![1];
  // The whole point: the street never reaches the service that owns the database.
  expect(createOrderPayload).not.toHaveProperty("shippingLine1");
  expect(createOrderPayload).not.toHaveProperty("shippingLine2");
  expect(createOrderPayload.shippingCity).toBe("Provo"); // city/state/zip still persisted

  const intentPayload = paymentsSend.mock.calls.find(
    ([pattern]) => pattern === "stripe.intent.create",
  )![1];
  expect(intentPayload.shipping).toEqual({
    name: "Ada Lovelace",
    line1: "12 Baker St",
    line2: "Flat 4",
    city: "Provo",
    state: "UT",
    zip: "84604",
    country: "US",
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm --filter @sitehaus-ecom/gateway test -- checkout.controller`
Expected: FAIL — `createOrder` still has `shippingLine1`; `intentPayload.shipping` is `undefined`.

- [ ] **Step 3: Stop sending the street to commerce**

In `apps/gateway/src/checkout/checkout.controller.ts`, delete the two `shippingLine1` / `shippingLine2` lines from the `checkout.createOrder` payload. It becomes:

```ts
const order = await firstValueFrom(
  this.commerce.send("checkout.createOrder", {
    storeId,
    sessionToken,
    userId,
    email: body.email,
    shippingName: body.address?.name,
    // line1/line2 deliberately NOT sent: the street goes to Stripe via payments below
    // and is never written to our database. See the address-minimization spec.
    shippingCity: body.address?.city,
    shippingState: body.address?.state,
    shippingZip: body.address?.zip,
    shippingCountry: body.address?.country,
    shippingRateId: body.shippingRateId,
  }),
);
```

- [ ] **Step 4: Send it to payments instead**

```ts
const { checkoutUrl } = await firstValueFrom(
  this.payments.send("stripe.intent.create", {
    orderId: order.orderId,
    cartId: order.cartId,
    successUrl: body.successUrl,
    cancelUrl: body.cancelUrl,
    stripeCouponId: automaticDiscount?.stripeCouponId ?? null,
    // In memory for the length of this request, then Stripe's problem, not ours.
    shipping: {
      name: body.address?.name,
      line1: body.address?.line1,
      line2: body.address?.line2,
      city: body.address?.city,
      state: body.address?.state,
      zip: body.address?.zip,
      country: body.address?.country,
    },
  }),
);
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @sitehaus-ecom/gateway test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/gateway/src/checkout/checkout.controller.ts apps/gateway/src/checkout/checkout.controller.spec.ts
git commit -m "feat(gateway): route the checkout street to stripe, not to the database"
```

---

### Task 4: Stop commerce persisting the street

Belt and braces. Task 3 stops the gateway _sending_ it; this stops commerce _storing_ it even if something else ever sends it.

**Files:**

- Modify: `apps/commerce/src/orders/checkout.service.ts:34-35` (input type) and `:146-147` (the insert)
- Modify: `apps/commerce/src/orders/checkout.handler.ts` (payload type)
- Test: `apps/commerce/src/orders/checkout.service.spec.ts`

**Interfaces:**

- Consumes: Task 3's slimmed `checkout.createOrder` payload
- Produces: `orders.shipping_line1` / `line2` are never written by new orders

- [ ] **Step 1: Write the failing test**

In `apps/commerce/src/orders/checkout.service.spec.ts`:

```ts
it("never writes a street, even if one is somehow passed", async () => {
  await service.createOrder({
    storeId: "store-1",
    sessionToken: "sess-1",
    email: "a@b.com",
    shippingName: "Ada Lovelace",
    shippingCity: "Provo",
    shippingState: "UT",
    shippingZip: "84604",
    shippingCountry: "US",
    // @ts-expect-error — the field is gone from the type; prove it's ignored at runtime too
    shippingLine1: "12 Baker St",
  });

  const inserted = insertValues.mock.calls.at(-1)![0];
  expect(inserted.shippingLine1).toBeUndefined();
  expect(inserted.shippingLine2).toBeUndefined();
  expect(inserted.shippingCity).toBe("Provo");
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm --filter @sitehaus-ecom/commerce test -- checkout.service`
Expected: FAIL — `inserted.shippingLine1` is `"12 Baker St"`.

- [ ] **Step 3: Remove the fields from the input type**

In `apps/commerce/src/orders/checkout.service.ts`, delete `shippingLine1?: string;` and `shippingLine2?: string;` from the `createOrder` parameter type (~lines 34-35). Do the same in the `@Payload()` type in `apps/commerce/src/orders/checkout.handler.ts`.

- [ ] **Step 4: Remove them from the insert**

In the `.values({...})` block (~lines 145-152):

```ts
        status: "pending",
        shippingName: data.shippingName ?? null,
        // shippingLine1/shippingLine2 are deliberately NOT written. The street lives on the
        // Stripe PaymentIntent (see the address-minimization spec). The columns remain,
        // nullable, holding legacy orders' streets until the redaction cron clears them.
        shippingCity: data.shippingCity ?? null,
        shippingState: data.shippingState ?? null,
        shippingZip: data.shippingZip ?? null,
        shippingCountry: data.shippingCountry ?? null,
        shippingRateId: resolvedShippingRateId,
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @sitehaus-ecom/commerce test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/commerce/src/orders/checkout.service.ts apps/commerce/src/orders/checkout.handler.ts apps/commerce/src/orders/checkout.service.spec.ts
git commit -m "feat(commerce): stop persisting the customer street"
```

---

### Task 5: Give the worker a way to fetch the street

The worker currently has **no payments client at all** — only DB, email, and queues. The three order emails print the full street, so they need one. This task adds the client and a single helper with the legacy fallback in it, so Task 6 is a trivial substitution.

**Files:**

- Modify: `apps/worker/src/app.module.ts` (register `PAYMENTS_SERVICE`)
- Modify: `apps/worker/src/processors/handlers/handler.context.ts` (add `payments`)
- Modify: `apps/worker/src/processors/notifications.processor.ts` (pass `payments` into the context it builds)
- Create: `apps/worker/src/processors/handlers/get-shipping-street.ts`
- Create: `apps/worker/src/processors/handlers/get-shipping-street.spec.ts`

**Interfaces:**

- Consumes: Task 2's `stripe.shipping.get`
- Produces: `getShippingStreet(ctx, order)` — used by all three email handlers in Task 6

- [ ] **Step 1: Write the failing test**

`apps/worker/src/processors/handlers/get-shipping-street.spec.ts`:

```ts
it("prefers the street from Stripe", async () => {
  paymentsSend.mockReturnValue(of({ line1: "12 Baker St", line2: "Flat 4" }));

  await expect(
    getShippingStreet(ctx, { id: "o1", shippingLine1: null, shippingLine2: null }),
  ).resolves.toEqual({ line1: "12 Baker St", line2: "Flat 4" });
});

it("falls back to the columns for a legacy order Stripe knows nothing about", async () => {
  paymentsSend.mockReturnValue(of({ line1: null, line2: null }));

  await expect(
    getShippingStreet(ctx, { id: "o1", shippingLine1: "9 Old Rd", shippingLine2: null }),
  ).resolves.toEqual({ line1: "9 Old Rd", line2: null });
});

it("falls back to the columns when payments is unreachable — never loses a receipt", async () => {
  paymentsSend.mockReturnValue(throwError(() => new Error("ECONNREFUSED")));

  await expect(
    getShippingStreet(ctx, { id: "o1", shippingLine1: "9 Old Rd", shippingLine2: null }),
  ).resolves.toEqual({ line1: "9 Old Rd", line2: null });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm --filter @sitehaus-ecom/worker test -- get-shipping-street`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Register the payments client**

In `apps/worker/src/app.module.ts`, add the imports and register the client (port 7022, matching the gateway):

```ts
import { ClientsModule, Transport } from "@nestjs/microservices";
```

and inside `imports`, after `BullModule.registerQueue(...)`:

```ts
    // The order emails print the customer's street, which now lives on the Stripe
    // PaymentIntent rather than in our database — so the worker has to be able to ask
    // payments for it. This is the one new coupling the address-minimization spec adds.
    ClientsModule.registerAsync([
      {
        name: "PAYMENTS_SERVICE",
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get("PAYMENTS_HOST", "localhost"),
            port: 7022,
          },
        }),
        inject: [ConfigService],
      },
    ]),
```

- [ ] **Step 4: Put it on the handler context**

`apps/worker/src/processors/handlers/handler.context.ts`:

```ts
import type { Db } from "@sitehaus-ecom/database";
import type { EmailService } from "@sitehaus-ecom/shared";
import type { Logger } from "@nestjs/common";
import type { ClientProxy } from "@nestjs/microservices";
import type { Job } from "bullmq";

export interface HandlerContext {
  db: Db;
  email: EmailService;
  logger: Logger;
  payments: ClientProxy;
}

export type Handler = (job: Job, ctx: HandlerContext) => Promise<void>;
```

Then in `apps/worker/src/processors/notifications.processor.ts`, inject `@Inject("PAYMENTS_SERVICE") private readonly payments: ClientProxy` and include `payments: this.payments` wherever it builds the `HandlerContext` it passes to handlers.

- [ ] **Step 5: Write the helper**

`apps/worker/src/processors/handlers/get-shipping-street.ts`:

```ts
import { firstValueFrom } from "rxjs";
import type { HandlerContext } from "./handler.context";

export type ShippingStreet = { line1: string | null; line2: string | null };

/**
 * Where the street lives depends on when the order was placed.
 *
 * New orders: on the Stripe PaymentIntent (our DB never saw it).
 * Legacy orders: still in `orders.shipping_line1/line2`, until the redaction cron clears them.
 *
 * Ask Stripe first, fall back to the columns. If payments is unreachable we STILL fall back
 * rather than throwing — an order confirmation that goes out with a blank street is bad, but
 * a confirmation that never goes out at all is worse.
 */
export async function getShippingStreet(
  ctx: HandlerContext,
  order: { id: string; shippingLine1: string | null; shippingLine2: string | null },
): Promise<ShippingStreet> {
  try {
    const fromStripe = await firstValueFrom(
      ctx.payments.send<ShippingStreet>("stripe.shipping.get", { orderId: order.id }),
    );
    if (fromStripe?.line1) return fromStripe;
  } catch (err: any) {
    ctx.logger.warn(`Shipping street lookup failed for order ${order.id}: ${err.message}`);
  }
  return { line1: order.shippingLine1, line2: order.shippingLine2 };
}
```

- [ ] **Step 6: Run tests**

Run: `pnpm --filter @sitehaus-ecom/worker test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/worker/src/app.module.ts apps/worker/src/processors/handlers/handler.context.ts apps/worker/src/processors/notifications.processor.ts apps/worker/src/processors/handlers/get-shipping-street.ts apps/worker/src/processors/handlers/get-shipping-street.spec.ts
git commit -m "feat(worker): fetch the shipping street from payments, fall back to legacy columns"
```

---

### Task 6: Make the three order emails use it

The confirmation email prints the full address so the customer can catch their own typo before the parcel ships. It must keep doing that.

**Files:**

- Modify: `apps/worker/src/processors/handlers/order-confirmed.handler.ts:55-56`
- Modify: `apps/worker/src/processors/handlers/order-shipped.handler.ts:54-55`
- Modify: `apps/worker/src/processors/handlers/order-delivered.handler.ts` (same two fields)
- Test: `apps/worker/src/processors/handlers/order-confirmed.handler.spec.ts`

**Interfaces:**

- Consumes: Task 5's `getShippingStreet(ctx, order)`
- Produces: nothing

- [ ] **Step 1: Write the failing test**

In `apps/worker/src/processors/handlers/order-confirmed.handler.spec.ts`:

```ts
it("renders the street fetched from Stripe, not the (now empty) column", async () => {
  dbFindFirst.mockResolvedValue({
    ...baseOrder,
    shippingLine1: null, // new order — our DB has no street
    shippingLine2: null,
  });
  paymentsSend.mockReturnValue(of({ line1: "12 Baker St", line2: "Flat 4" }));

  await handleOrderConfirmed(job, ctx);

  const props = (OrderConfirmed as jest.Mock).mock.calls[0][0];
  expect(props.shippingLine1).toBe("12 Baker St");
  expect(props.shippingLine2).toBe("Flat 4");
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm --filter @sitehaus-ecom/worker test -- order-confirmed`
Expected: FAIL — `props.shippingLine1` is `""` (it reads the empty column).

- [ ] **Step 3: Fetch the street in each handler**

In each of the three handlers, after the order is loaded and before `render(...)`, add:

```ts
const street = await getShippingStreet(ctx, order);
```

with the import:

```ts
import { getShippingStreet } from "./get-shipping-street";
```

- [ ] **Step 4: Use it in the email props**

In each handler's email props, replace the two street lines:

```ts
      shippingName: order.shippingName ?? "",
      shippingLine1: street.line1 ?? "",
      shippingLine2: street.line2,
      shippingCity: order.shippingCity ?? "",
```

(`order-shipped` and `order-delivered` pass the same two fields — change them identically. Leave every other field reading from `order`.)

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @sitehaus-ecom/worker test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/worker/src/processors/handlers/order-confirmed.handler.ts apps/worker/src/processors/handlers/order-shipped.handler.ts apps/worker/src/processors/handlers/order-delivered.handler.ts apps/worker/src/processors/handlers/order-confirmed.handler.spec.ts
git commit -m "feat(worker): order emails render the street from stripe"
```

---

### Task 7: Admin order detail shows the street again

Without this, every new order in the admin shows a blank street.

**Files:**

- Modify: `apps/gateway/src/orders/orders-admin.controller.ts:37-49` (`adminGetOrder`)
- Test: `apps/gateway/src/orders/orders-admin.controller.spec.ts`

**Interfaces:**

- Consumes: Task 2's `stripe.shipping.get`
- Produces: nothing. The response shape is unchanged — `shippingLine1`/`line2` are simply populated from Stripe, so the admin UI needs no change.

- [ ] **Step 1: Write the failing test**

```ts
it("fills the street from Stripe on a new order", async () => {
  commerceSend.mockReturnValue(of({ ...order, shippingLine1: null, shippingLine2: null }));
  paymentsSend.mockReturnValue(of({ line1: "12 Baker St", line2: "Flat 4" }));

  const res = await controller.adminGetOrder(req).then((h) => h({ params: { orderId: "o1" } }));

  expect(res.body.shippingLine1).toBe("12 Baker St");
  expect(res.body.shippingLine2).toBe("Flat 4");
});

it("keeps the legacy column value when Stripe has no shipping", async () => {
  commerceSend.mockReturnValue(of({ ...order, shippingLine1: "9 Old Rd", shippingLine2: null }));
  paymentsSend.mockReturnValue(of({ line1: null, line2: null }));

  const res = await controller.adminGetOrder(req).then((h) => h({ params: { orderId: "o1" } }));
  expect(res.body.shippingLine1).toBe("9 Old Rd");
});

it("renders the order anyway when payments is down", async () => {
  commerceSend.mockReturnValue(of({ ...order, shippingLine1: null, shippingLine2: null }));
  paymentsSend.mockReturnValue(throwError(() => new Error("ECONNREFUSED")));

  const res = await controller.adminGetOrder(req).then((h) => h({ params: { orderId: "o1" } }));
  expect(res.status).toBe(200); // the page must not die over a missing street
  expect(res.body.shippingLine1).toBeNull();
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm --filter @sitehaus-ecom/gateway test -- orders-admin`
Expected: FAIL — `shippingLine1` is `null` (nothing asks Stripe).

- [ ] **Step 3: Merge the street into the response**

```ts
  @TsRestHandler(contract.orders.adminGetOrder)
  adminGetOrder(@Req() req: Request) {
    return tsRestHandler(contract.orders.adminGetOrder, async ({ params }) => {
      const body = await firstValueFrom(
        this.commerce.send("orders.adminGet", {
          storeId: req.store!.id,
          orderId: params.orderId,
        }),
      );

      // The street isn't in our database for new orders — it's on the Stripe PaymentIntent.
      // A legacy order still has it in its columns, so only overwrite when Stripe actually
      // has something. If payments is unreachable we render the order without a street
      // rather than failing the page.
      let street = { line1: null as string | null, line2: null as string | null };
      try {
        street = await firstValueFrom(
          this.payments.send<{ line1: string | null; line2: string | null }>(
            "stripe.shipping.get",
            { orderId: params.orderId },
          ),
        );
      } catch {
        // fall through — body keeps whatever the columns held
      }

      return {
        status: 200 as const,
        body: {
          ...body,
          shippingLine1: street.line1 ?? body.shippingLine1,
          shippingLine2: street.line2 ?? body.shippingLine2,
        },
      };
    });
  }
```

Ensure `PAYMENTS_SERVICE` is injected in this controller's constructor (it may only have `COMMERCE_SERVICE` today):

```ts
    @Inject("PAYMENTS_SERVICE") private readonly payments: ClientProxy,
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @sitehaus-ecom/gateway test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/gateway/src/orders/orders-admin.controller.ts apps/gateway/src/orders/orders-admin.controller.spec.ts
git commit -m "feat(gateway): admin order detail resolves the street from stripe"
```

---

### Task 8: The redaction cron

**This task destroys data irreversibly.** It gets a dry-run mode and a real-Postgres test, and neither is optional.

**Files:**

- Create: `apps/worker/src/processors/address-redaction.processor.ts`
- Create: `apps/worker/src/processors/address-redaction.processor.spec.ts`
- Create: `apps/worker/src/processors/address-redaction.integration.spec.ts`
- Modify: `apps/worker/src/app.module.ts` (add the processor to `providers`)
- Modify: `apps/worker/src/main.ts` (register the repeatable job)

**Interfaces:**

- Consumes: nothing
- Produces: job `address.redact` on the `ecom-orders` queue

- [ ] **Step 1: Write the failing DB-level integration test**

Model it on `apps/commerce/src/variants/variations-sync.integration.spec.ts` — a real scratch Postgres, migrated. Fakes cannot prove a destructive `UPDATE` targets the right rows.

`apps/worker/src/processors/address-redaction.integration.spec.ts`:

```ts
it("redacts only orders past the dispute window", async () => {
  const old = await insertOrder({ createdAt: daysAgo(121), line1: "9 Old Rd" });
  const edge = await insertOrder({ createdAt: daysAgo(119), line1: "8 Edge St" });
  const fresh = await insertOrder({ createdAt: daysAgo(1), line1: "1 New Ave" });

  await processor.process({ data: {} } as Job);

  expect(await readLine1(old)).toBeNull();
  expect(await readLine1(edge)).toBe("8 Edge St"); // still inside the window — untouchable
  expect(await readLine1(fresh)).toBe("1 New Ave");
});

it("leaves city/state/zip alone — they are not the sensitive part", async () => {
  const old = await insertOrder({ createdAt: daysAgo(200), line1: "9 Old Rd", city: "Provo" });
  await processor.process({ data: {} } as Job);

  const row = await readOrder(old);
  expect(row.shippingLine1).toBeNull();
  expect(row.shippingCity).toBe("Provo");
  expect(row.shippingName).not.toBeNull();
});

it("dry run reports what it would redact and changes nothing", async () => {
  const old = await insertOrder({ createdAt: daysAgo(200), line1: "9 Old Rd" });

  const result = await processor.process({ data: { dryRun: true } } as Job);

  expect(result.wouldRedact).toBe(1);
  expect(await readLine1(old)).toBe("9 Old Rd"); // untouched
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm --filter @sitehaus-ecom/worker test -- address-redaction`
Expected: FAIL — processor does not exist.

- [ ] **Step 3: Write the processor**

`apps/worker/src/processors/address-redaction.processor.ts`:

```ts
import { Inject, Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { and, isNotNull, lt, or, sql, ordersTable, type Db } from "@sitehaus-ecom/database";
import { DB_TOKEN } from "@sitehaus-ecom/shared";
import type { Job } from "bullmq";

/**
 * Stripe's chargeback window is ~120 days. Redacting a street before it closes would strip a
 * store of its dispute defence — proving you shipped to the address the customer gave you is
 * exactly how you win one. So this is deliberately "redact once the window closes", not
 * "delete on delivery". Do not shorten this without understanding that trade.
 *
 * Only line1/line2 go. City/state/zip/name stay: they drive shipping zones, tax and
 * analytics, and are not the part that points at someone's front door.
 */
const DISPUTE_WINDOW_DAYS = 120;

@Processor("ecom-orders")
export class AddressRedactionProcessor extends WorkerHost {
  private readonly logger = new Logger(AddressRedactionProcessor.name);

  constructor(@Inject(DB_TOKEN) private readonly db: Db) {
    super();
  }

  async process(job: Job): Promise<{ redacted?: number; wouldRedact?: number }> {
    if (job.name !== "address.redact") return {};

    const dryRun = (job.data as { dryRun?: boolean })?.dryRun === true;
    const cutoff = sql`now() - interval '${sql.raw(String(DISPUTE_WINDOW_DAYS))} days'`;
    const stale = and(
      lt(ordersTable.createdAt, cutoff),
      or(isNotNull(ordersTable.shippingLine1), isNotNull(ordersTable.shippingLine2)),
    );

    if (dryRun) {
      const rows = await this.db.select({ id: ordersTable.id }).from(ordersTable).where(stale);
      this.logger.log(`[dry run] would redact the street on ${rows.length} order(s)`);
      return { wouldRedact: rows.length };
    }

    const redacted = await this.db
      .update(ordersTable)
      .set({ shippingLine1: null, shippingLine2: null })
      .where(stale)
      .returning({ id: ordersTable.id });

    if (redacted.length) {
      this.logger.log(`Redacted the street on ${redacted.length} order(s) past the dispute window`);
    }
    return { redacted: redacted.length };
  }
}
```

- [ ] **Step 4: Register it**

Add `AddressRedactionProcessor` to `providers` in `apps/worker/src/app.module.ts` (with its import).

In `apps/worker/src/main.ts`, after the existing `ordersQueue` registration:

```ts
await ordersQueue.add(
  "address.redact",
  {},
  {
    repeat: { pattern: "0 4 * * *" }, // daily 4am UTC, after cart.expire
    removeOnComplete: 5,
    removeOnFail: 10,
  },
);
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @sitehaus-ecom/worker test`
Expected: PASS, including the integration suite.

- [ ] **Step 6: Dry-run it against the real dev database before trusting it**

Do not skip this. Confirm the count is plausible (the 95 seeded orders are recent, so it should report **0**):

```bash
docker exec ecom-db psql -U ecom -d ecommerce -c "select count(*) from orders where created_at < now() - interval '120 days' and shipping_line1 is not null;"
```

- [ ] **Step 7: Commit**

```bash
git add apps/worker/src/processors/address-redaction.processor.ts apps/worker/src/processors/address-redaction.processor.spec.ts apps/worker/src/processors/address-redaction.integration.spec.ts apps/worker/src/app.module.ts apps/worker/src/main.ts
git commit -m "feat(worker): redact order streets past the dispute window"
```

---

### Task 9: Admin UI degrades gracefully

**Repo: `~/Dev/sitehaus`** (not sitehaus-commerce).

The API shape is unchanged, so the page still renders — but when payments is down `shippingLine1` is `null` and the address block silently collapses. Say so instead.

**Files:**

- Modify: `apps/commerce/app/[storeSlug]/(admin)/orders/[id]/page.tsx`

**Interfaces:**

- Consumes: Task 7's response (unchanged shape; `shippingLine1` may be `null`)
- Produces: nothing

- [ ] **Step 1: Find the address block**

```bash
grep -n "shippingLine1\|shippingCity" "apps/commerce/app/[storeSlug]/(admin)/orders/[id]/page.tsx"
```

- [ ] **Step 2: Handle the null**

Where the street is rendered, show a muted note rather than an empty line:

```tsx
{
  order.shippingLine1 ? (
    <>
      <div>{order.shippingLine1}</div>
      {order.shippingLine2 && <div>{order.shippingLine2}</div>}
    </>
  ) : (
    <div className="text-muted-foreground italic">Street unavailable</div>
  );
}
```

Leave the city/state/zip lines exactly as they are — those still come from our database and are always present.

- [ ] **Step 3: Verify**

Run: `pnpm --filter commerce check-types` — expect clean.
Run: `pnpm --filter commerce lint` — expect no new warnings in the touched file.

- [ ] **Step 4: Commit**

```bash
git add "apps/commerce/app/[storeSlug]/(admin)/orders/[id]/page.tsx"
git commit -m "fix(commerce-ui): say so when an order's street is unavailable"
```

---

## Final Verification

Run before declaring done:

```bash
cd ~/Dev/sitehaus-commerce && pnpm test && pnpm check-types
cd ~/Dev/sitehaus && pnpm --filter commerce check-types && pnpm --filter commerce lint
```

Then exercise it end to end — this feature reroutes real money-adjacent data and the unit tests all use mocked Stripe:

1. Start both stacks (`pnpm dev` in each; the commerce API needs `ecom-db` healthy first).
2. Place a test order through a storefront checkout.
3. **Assert the street is NOT in the database:**
   ```bash
   docker exec ecom-db psql -U ecom -d ecommerce -c "select shipping_line1, shipping_city from orders order by created_at desc limit 1;"
   ```
   Expected: `shipping_line1` is **null**, `shipping_city` is populated.
4. **Assert Stripe has it:** find the PaymentIntent in the Stripe test dashboard; it should carry a `shipping` object with the street.
5. Open the order in the admin — the street should render (fetched from Stripe).
6. Check the confirmation email — it should print the full address.

## Known Limitations (carried from the spec — do not "fix" these here)

- Reduces breach surface, **not** legal obligation. SiteHaus stays the data controller. (F-064)
- The street is still rendered into emails and therefore retained by **Resend**. (F-063)
- The 95 legacy orders keep their street until the dispute window closes.
- Adds a Stripe dependency to order display and emails, which touch only Postgres today.

## Out of Scope / Follow-ups Spotted

- `order-confirmed.handler.ts:68` sends from **`orders@sitehaus.io`** — the wrong domain (should be `notify.sitehaus.dev`). A live bug, but unrelated. Fix separately.
- Dropping `shipping_line1`/`line2` entirely, once the columns are provably empty.
