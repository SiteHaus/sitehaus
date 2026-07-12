# Products & Variations UX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the jargon-heavy "options + variants" product editor with a plain-language, progressive-disclosure UI backed by one atomic bulk-sync endpoint — no DB migration.

**Architecture:** The backend (`sitehaus-commerce`, has jest) gains one additive endpoint, `PUT /v1/admin/products/:id/variations`, that takes the desired "dimensions" (a seller-named thing that varies, e.g. Size) + the row set and reconciles options/values/variants in a single transaction. The frontend (`sitehaus/apps/commerce`, no test harness) rebuilds the product-detail variation section to speak in the seller's words and calls that one endpoint. Existing option/value/variant tables and storefront logic are unchanged.

**Tech Stack:** NestJS 11 + ts-rest + Drizzle + jest (backend); Next.js 15 + React Query + Tailwind (frontend). pnpm workspaces in two separate monorepos.

## Global Constraints

- **No DB schema change / migration.** "Dimension" ⇄ `product_options`; "value" ⇄ `product_option_values`; "row" ⇄ `product_variants` (with `variant_option_values`). Reuse existing tables only.
- **UI vocabulary:** never render the words "variant" or "option". The seller names each thing that varies; table columns and section headers use those names. Internal/DB/type names may keep "option"/"variant".
- **Max 3 dimensions.** Hide the "add another" affordance at 3.
- **Live row counter always visible; confirm step when an action would create > 25 rows** (`ROW_CONFIRM_THRESHOLD = 25`, tunable).
- **Frontend standards** (`apps/commerce/CLAUDE.md`): one component per file; `"use client"`; thin page files; React Query for data; `["store"]`/`["product", id]` query keys already in use.
- **Backend:** ts-rest contract is the source of truth; gateway controller `send()`s a `catalog.*` TCP message to the commerce service; guard admin routes with `@CommercePerm(...)` + `@UseGuards(AdminStoreGuard)`.
- **Frontend has no test runner.** Do NOT add one. Frontend tasks verify via `pnpm --filter commerce check-types`, `pnpm --filter commerce lint`, and the manual steps given. All correctness-critical logic is unit-tested on the backend.
- **Commits:** short one-line messages, **no `Co-Authored-By` trailer**.

## Shared interface (used by every task)

The sync endpoint's request/response shape. Every task refers back to this.

```ts
// Request body of PUT /v1/admin/products/:id/variations
type SyncVariationsBody = {
  // Ordered dimensions. [] => plain product (one default variant, no options).
  dimensions: Array<{ name: string; values: string[] }>; // values ordered, unique within a dimension
  // The combinations the seller wants to keep. Omitting a combination deletes it.
  // `values` are the value labels in dimension order; [] for a plain product's single row.
  rows: Array<{
    values: string[];
    priceCents: number;
    stock: number;
    sku?: string | null;
    isActive?: boolean;
    compareAtCents?: number | null;
  }>;
};

// Response: the refreshed product plus any combinations that could NOT be hard-deleted
// because they have active orders — those are DEACTIVATED (isActive=false) and
// preserved for order history, then surfaced to the user.
type SyncVariationsResult = {
  product: ProductDetail; // same shape catalog.products.get returns
  blocked: Array<{ variantId: string; name: string }>;
};
```

---

## Phase 1 — Backend bulk-sync endpoint (`~/Dev/sitehaus-commerce`)

### Task 1: Validation schema for the sync payload

> **No test runner in `packages/validation`** (only `build`/`dev`, no jest). Do **not** add one. Verify via `check-types`. This schema's guards (`.max(3)` dimensions, `priceCents >= 0`) are also enforced downstream by Task 3's service (combination validation, exercised by its spec) and by the frontend dimension cap.

**Files:**

- Modify: `packages/validation/src/variants.schemas.ts`
- Modify (only if needed): `packages/validation/src/index.ts` (barrel re-export)

**Interfaces:**

- Produces: `syncVariationsSchema` (zod), `SyncVariationsDto` (type). (`syncVariationsResultSchema` is added later, in Task 4, alongside the contract route.)

- [ ] **Step 1: Add the schema**

Append to `packages/validation/src/variants.schemas.ts` (add `import { z } from "zod";` at the top if not already present):

```ts
export const syncVariationsSchema = z.object({
  dimensions: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        values: z.array(z.string().trim().min(1)).min(1),
      }),
    )
    .max(3),
  rows: z
    .array(
      z.object({
        values: z.array(z.string().trim().min(1)),
        priceCents: z.number().int().min(0),
        stock: z.number().int().min(0),
        sku: z.string().trim().min(1).nullable().optional(),
        isActive: z.boolean().optional(),
        compareAtCents: z.number().int().min(0).nullable().optional(),
      }),
    )
    .max(200),
});
export type SyncVariationsDto = z.infer<typeof syncVariationsSchema>;
```

- [ ] **Step 2: Ensure it's exported from the package barrel**

Grep `packages/validation/src/index.ts` for `variants.schemas`. If the file re-exports each schema module explicitly and `variants.schemas` is missing, add `export * from "./variants.schemas";` (match the existing export style). If the barrel already re-exports it (e.g. `export * from "./variants.schemas"`), no change needed.

- [ ] **Step 3: Verify it typechecks**

Run: `cd ~/Dev/sitehaus-commerce && pnpm --filter @sitehaus-ecom/validation check-types`
Expected: clean.

- [ ] **Step 4: Commit (exact files only — the tree has unrelated in-flight changes; never `git add -A`)**

```bash
git add packages/validation/src/variants.schemas.ts
# add index.ts too ONLY if you edited it in Step 2:
# git add packages/validation/src/index.ts
git commit -m "feat(validation): syncVariations payload schema"
```

---

### Task 2: Pure reconcile + generation helpers

The heart of the feature — pure functions, no DB. Kept in the commerce app next to the service.

**Files:**

- Create: `apps/commerce/src/variants/variations.logic.ts`
- Test: `apps/commerce/src/variants/variations.logic.spec.ts`

**Interfaces:**

- Produces:
  - `generateCombinations(dimensions: {name:string; values:string[]}[]): string[][]` — cartesian product; `[]` dimensions → `[[]]` (one empty combo).
  - `keyOf(values: string[]): string` — stable key for a combination (order-sensitive, case-sensitive).
  - `diffVariants(args): { toCreate, toUpdate, toDelete }` — see signature in Step 3.

- [ ] **Step 1: Write the failing test**

```ts
// apps/commerce/src/variants/variations.logic.spec.ts
import { generateCombinations, keyOf, diffVariants } from "./variations.logic";

describe("generateCombinations", () => {
  it("returns one empty combo for no dimensions", () => {
    expect(generateCombinations([])).toEqual([[]]);
  });
  it("returns each value for one dimension", () => {
    expect(generateCombinations([{ name: "Size", values: ["S", "M"] }])).toEqual([["S"], ["M"]]);
  });
  it("returns the cartesian product for two dimensions", () => {
    const out = generateCombinations([
      { name: "Size", values: ["S", "M"] },
      { name: "Color", values: ["Red", "Blue"] },
    ]);
    expect(out).toEqual([
      ["S", "Red"],
      ["S", "Blue"],
      ["M", "Red"],
      ["M", "Blue"],
    ]);
  });
});

describe("diffVariants", () => {
  const existing = [
    { id: "v1", valueKey: keyOf(["S"]) },
    { id: "v2", valueKey: keyOf(["M"]) },
  ];
  it("creates new combos, updates matches, deletes the rest", () => {
    const rows = [
      { values: ["S"], priceCents: 100, stock: 1 }, // matches v1 -> update
      { values: ["L"], priceCents: 300, stock: 3 }, // new -> create
    ];
    const d = diffVariants({ existing, rows });
    expect(d.toUpdate.map((u) => u.id)).toEqual(["v1"]);
    expect(d.toCreate.map((c) => c.values)).toEqual([["L"]]);
    expect(d.toDelete).toEqual(["v2"]); // M no longer wanted
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @sitehaus-ecom/commerce test -- variations.logic`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helpers**

```ts
// apps/commerce/src/variants/variations.logic.ts
export function generateCombinations(dimensions: { name: string; values: string[] }[]): string[][] {
  return dimensions.reduce<string[][]>(
    (acc, dim) => acc.flatMap((combo) => dim.values.map((v) => [...combo, v])),
    [[]],
  );
}

export function keyOf(values: string[]): string {
  return JSON.stringify(values);
}

export type DesiredRow = {
  values: string[];
  priceCents: number;
  stock: number;
  sku?: string | null;
  isActive?: boolean;
  compareAtCents?: number | null;
};

export function diffVariants(args: {
  existing: { id: string; valueKey: string }[];
  rows: DesiredRow[];
}): {
  toCreate: DesiredRow[];
  toUpdate: { id: string; row: DesiredRow }[];
  toDelete: string[];
} {
  const existingByKey = new Map(args.existing.map((e) => [e.valueKey, e.id]));
  const wantedKeys = new Set(args.rows.map((r) => keyOf(r.values)));
  const toCreate: DesiredRow[] = [];
  const toUpdate: { id: string; row: DesiredRow }[] = [];
  for (const row of args.rows) {
    const id = existingByKey.get(keyOf(row.values));
    if (id) toUpdate.push({ id, row });
    else toCreate.push(row);
  }
  const toDelete = args.existing.filter((e) => !wantedKeys.has(e.valueKey)).map((e) => e.id);
  return { toCreate, toUpdate, toDelete };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @sitehaus-ecom/commerce test -- variations.logic`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/commerce/src/variants/variations.logic.ts apps/commerce/src/variants/variations.logic.spec.ts
git commit -m "feat(commerce): pure combination generation + variant diff"
```

---

### Task 3: Sync service (DB reconcile) + message handler

**Files:**

- Create: `apps/commerce/src/variants/variations-sync.service.ts`
- Modify: `apps/commerce/src/variants/variants-handler.controller.ts` (add message pattern)
- Modify: `apps/commerce/src/variants/variants-handler.module.ts` (provide the new service)
- Test: `apps/commerce/src/variants/variations-sync.service.spec.ts`

**Interfaces:**

- Consumes: `generateCombinations`, `keyOf`, `diffVariants` (Task 2); `productOptionsTable`, `productOptionValuesTable`, `productVariantsTable`, `variantOptionValuesTable`, `inventoryTable`, `orderItemsTable`, `ordersTable` from `@sitehaus-ecom/database`; `SyncVariationsDto` (Task 1).
- Produces: message pattern `catalog.variations.sync` accepting `{ productId: string; storeId: string } & SyncVariationsDto` and returning `SyncVariationsResult` (see Shared interface). Reuses the existing active-order guard query from `variants-handler.service.ts:164-178` (same `notInArray(ordersTable.status, ["cancelled","abandoned","refunded","failed"])`).

- [ ] **Step 1: Write the failing test (mocked db, mirrors `refund.service.spec.ts` style)**

```ts
// apps/commerce/src/variants/variations-sync.service.spec.ts
import { NotFoundException } from "@nestjs/common";
import { VariationsSyncService } from "./variations-sync.service";

// The pure diff/generation logic (Task 2) carries the correctness tests. Here we
// only assert the service's guard rails with a hand-rolled db mock (mirrors the
// direct-construction style used across this repo's *.service.spec.ts).
describe("VariationsSyncService", () => {
  const audit = { log: jest.fn() } as any;

  it("throws NotFound when the product does not belong to the store", async () => {
    const db: any = { query: { productsTable: { findFirst: jest.fn().mockResolvedValue(null) } } };
    const svc = new VariationsSyncService(db, audit);
    await expect(
      svc.sync({ productId: "p1", storeId: "s1", dimensions: [], rows: [] }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects a row whose values are not a valid combination", async () => {
    const db: any = {
      query: { productsTable: { findFirst: jest.fn().mockResolvedValue({ id: "p1", name: "X" }) } },
    };
    const svc = new VariationsSyncService(db, audit);
    await expect(
      svc.sync({
        productId: "p1",
        storeId: "s1",
        dimensions: [{ name: "Size", values: ["S"] }],
        rows: [{ values: ["XL"], priceCents: 100, stock: 1 }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

> The two guard-rail checks above run **before** the `db.transaction(...)`, so they need no transaction mock. Deeper reconcile coverage is unnecessary because Task 2 already tests the diff/generation; keep the service thin — it only maps Task 2's output onto Drizzle writes inside one transaction.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @sitehaus-ecom/commerce test -- variations-sync`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the service**

```ts
// apps/commerce/src/variants/variations-sync.service.ts
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService, DB_TOKEN } from "@sitehaus-ecom/shared";
import {
  and,
  eq,
  inArray,
  notInArray,
  Db,
  inventoryTable,
  orderItemsTable,
  ordersTable,
  productOptionValuesTable,
  productOptionsTable,
  productVariantsTable,
  variantOptionValuesTable,
} from "@sitehaus-ecom/database";
import type { SyncVariationsDto } from "@sitehaus-ecom/validation";
import { diffVariants, generateCombinations, keyOf } from "./variations.logic";

@Injectable()
export class VariationsSyncService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async sync(data: { productId: string; storeId: string } & SyncVariationsDto) {
    const product = await this.db.query.productsTable.findFirst({
      where: (p) => and(eq(p.id, data.productId), eq(p.storeId, data.storeId)),
    });
    if (!product) throw new NotFoundException("Product not found.");

    // Validate rows are a subset of the generated combination space.
    const validKeys = new Set(generateCombinations(data.dimensions).map(keyOf));
    for (const row of data.rows) {
      if (!validKeys.has(keyOf(row.values))) {
        throw new NotFoundException(`Combination not valid: ${row.values.join(" / ")}`);
      }
    }

    const blocked: { variantId: string; name: string }[] = [];

    await this.db.transaction(async (tx) => {
      // 1. Upsert options (by name, in order); delete options no longer present.
      const existingOptions = await tx.query.productOptionsTable.findMany({
        where: (o) => eq(o.productId, data.productId),
      });
      const wantedNames = new Set(data.dimensions.map((d) => d.name));
      const staleOptions = existingOptions.filter((o) => !wantedNames.has(o.name));
      if (staleOptions.length) {
        await tx.delete(productOptionsTable).where(
          inArray(
            productOptionsTable.id,
            staleOptions.map((o) => o.id),
          ),
        ); // cascades values + variant_option_values
      }

      const valueIdByDimValue = new Map<string, string>(); // key: `${dimIdx}:${value}` -> valueId
      for (let i = 0; i < data.dimensions.length; i++) {
        const dim = data.dimensions[i];
        let option = existingOptions.find((o) => o.name === dim.name);
        if (!option) {
          [option] = await tx
            .insert(productOptionsTable)
            .values({
              productId: data.productId,
              storeId: data.storeId,
              name: dim.name,
              sortOrder: i,
            })
            .returning();
        } else {
          await tx
            .update(productOptionsTable)
            .set({ sortOrder: i })
            .where(eq(productOptionsTable.id, option.id));
        }
        const existingValues = await tx.query.productOptionValuesTable.findMany({
          where: (v) => eq(v.optionId, option!.id),
        });
        const wantedValues = new Set(dim.values);
        const staleValues = existingValues.filter((v) => !wantedValues.has(v.value));
        if (staleValues.length) {
          await tx.delete(productOptionValuesTable).where(
            inArray(
              productOptionValuesTable.id,
              staleValues.map((v) => v.id),
            ),
          );
        }
        for (let j = 0; j < dim.values.length; j++) {
          const label = dim.values[j];
          let val = existingValues.find((v) => v.value === label);
          if (!val) {
            [val] = await tx
              .insert(productOptionValuesTable)
              .values({ optionId: option.id, value: label, sortOrder: j })
              .returning();
          } else {
            await tx
              .update(productOptionValuesTable)
              .set({ sortOrder: j })
              .where(eq(productOptionValuesTable.id, val.id));
          }
          valueIdByDimValue.set(`${i}:${label}`, val.id);
        }
      }

      // 2. Load existing variants with their value-key.
      const existingVariants = await tx.query.productVariantsTable.findMany({
        where: (v) => eq(v.productId, data.productId),
      });
      const linkRows = existingVariants.length
        ? await tx
            .select({
              variantId: variantOptionValuesTable.variantId,
              value: productOptionValuesTable.value,
              sortOrder: productOptionsTable.sortOrder,
            })
            .from(variantOptionValuesTable)
            .innerJoin(
              productOptionValuesTable,
              eq(variantOptionValuesTable.optionValueId, productOptionValuesTable.id),
            )
            .innerJoin(
              productOptionsTable,
              eq(productOptionValuesTable.optionId, productOptionsTable.id),
            )
            .where(
              inArray(
                variantOptionValuesTable.variantId,
                existingVariants.map((v) => v.id),
              ),
            )
        : [];
      const keyByVariant = new Map<string, string[]>();
      for (const l of linkRows) {
        const arr = keyByVariant.get(l.variantId) ?? [];
        arr[l.sortOrder] = l.value;
        keyByVariant.set(l.variantId, arr);
      }
      const existing = existingVariants.map((v) => ({
        id: v.id,
        valueKey: keyOf((keyByVariant.get(v.id) ?? []).filter((x) => x !== undefined)),
      }));

      const { toCreate, toUpdate, toDelete } = diffVariants({ existing, rows: data.rows });

      // 3. Deletes (guarded by active orders).
      for (const id of toDelete) {
        const active = await tx
          .select({ id: orderItemsTable.id })
          .from(orderItemsTable)
          .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
          .where(
            and(
              eq(orderItemsTable.variantId, id),
              notInArray(ordersTable.status, ["cancelled", "abandoned", "refunded", "failed"]),
            ),
          )
          .limit(1);
        if (active.length) {
          // Can't hard-delete a variant with active orders. Honor the seller's
          // intent to remove it by deactivating it (hidden from storefront,
          // preserved for order history), and report it as blocked.
          const v = existingVariants.find((e) => e.id === id)!;
          await tx
            .update(productVariantsTable)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(productVariantsTable.id, id));
          blocked.push({ variantId: id, name: v.name });
          continue;
        }
        await tx.delete(productVariantsTable).where(eq(productVariantsTable.id, id));
      }

      // 4. Updates.
      for (const { id, row } of toUpdate) {
        await tx
          .update(productVariantsTable)
          .set({
            name: row.values.length ? row.values.join(" / ") : product.name,
            priceCents: row.priceCents,
            sku: row.sku ?? null,
            compareAtCents: row.compareAtCents ?? null,
            isActive: row.isActive ?? true,
            updatedAt: new Date(),
          })
          .where(eq(productVariantsTable.id, id));
        await tx
          .update(inventoryTable)
          .set({ stock: row.stock })
          .where(eq(inventoryTable.variantId, id));
      }

      // 5. Creates.
      for (const row of toCreate) {
        const [variant] = await tx
          .insert(productVariantsTable)
          .values({
            productId: data.productId,
            storeId: data.storeId,
            name: row.values.length ? row.values.join(" / ") : product.name,
            priceCents: row.priceCents,
            sku: row.sku ?? null,
            compareAtCents: row.compareAtCents ?? null,
            isActive: row.isActive ?? true,
            sortOrder: 0,
          })
          .returning();
        await tx
          .insert(inventoryTable)
          .values({ variantId: variant.id, storeId: data.storeId, stock: row.stock, reserved: 0 });
        const optionValueIds = row.values.map(
          (label, i) => valueIdByDimValue.get(`${i}:${label}`)!,
        );
        if (optionValueIds.length) {
          await tx
            .insert(variantOptionValuesTable)
            .values(
              optionValueIds.map((optionValueId) => ({ variantId: variant.id, optionValueId })),
            );
        }
      }
    });

    void this.audit.log({
      storeId: data.storeId,
      action: "variations.synced",
      targetType: "product",
      targetId: data.productId,
    });

    return { productId: data.productId, blocked };
  }
}
```

> The controller/gateway returns the refreshed product by re-fetching via the existing `catalog.products.get` path (see Task 5) so we don't duplicate the product-detail assembly here.

- [ ] **Step 4: Register the handler + provider**

In `apps/commerce/src/variants/variants-handler.controller.ts` add:

```ts
import { VariationsSyncService } from "./variations-sync.service";
import type { SyncVariationsDto } from "@sitehaus-ecom/validation";
// ...in the constructor add: private readonly variationsSync: VariationsSyncService
  @MessagePattern("catalog.variations.sync")
  syncVariations(@Payload() data: { productId: string; storeId: string } & SyncVariationsDto) {
    return this.variationsSync.sync(data);
  }
```

In `apps/commerce/src/variants/variants-handler.module.ts` add `VariationsSyncService` to `providers`.

- [ ] **Step 5: Run tests + typecheck**

Run: `pnpm --filter @sitehaus-ecom/commerce test -- variations-sync && pnpm --filter @sitehaus-ecom/commerce check-types`
Expected: PASS + clean types.

- [ ] **Step 6: Commit**

```bash
git add apps/commerce/src/variants/
git commit -m "feat(commerce): variations.sync reconcile service + handler"
```

---

### Task 4: Contract route

**Files:**

- Modify: `packages/contracts/src/variants/variants.contract.ts`
- Modify: `packages/validation/src/variants.schemas.ts` (add result schema + `syncVariationsResultSchema`)

**Interfaces:**

- Consumes: `syncVariationsSchema` (Task 1), the `adminProductDetail`/product-detail response schema already used by `contract.product.getProduct` (import the same schema the product contract uses for its 200 body).
- Produces: `contract.variant.syncVariations` — `PUT /v1/admin/products/:productId/variations`.

- [ ] **Step 1: Add the result schema** to `packages/validation/src/variants.schemas.ts`:

```ts
// Reuse the product-detail schema that contract.product.getProduct returns.
// Import it here (adjust the import to the actual exported name in product.schemas).
import { adminProductDetailSchema } from "./product.schemas";

export const syncVariationsResultSchema = z.object({
  product: adminProductDetailSchema,
  blocked: z.array(z.object({ variantId: z.string().uuid(), name: z.string() })),
});
```

> If the product-detail response schema lives under a different name/file, import that one instead — grep `product.schemas.ts` for the schema referenced by `contract.product.getProduct`'s `responses[200]`.

- [ ] **Step 2: Add the route** to `packages/contracts/src/variants/variants.contract.ts`:

```ts
import { syncVariationsSchema, syncVariationsResultSchema, variantPathParams } from "@sitehaus-ecom/validation";
// ...inside c.router({ ... }) add:
  syncVariations: {
    method: "PUT",
    path: "/v1/admin/products/:productId/variations",
    body: syncVariationsSchema,
    pathParams: variantPathParams, // { productId: string } — reuse existing
    responses: { 200: syncVariationsResultSchema, 404: apiError, 409: apiError },
    metadata: { openApiTags: ["Variants"] } as const,
  },
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @sitehaus-ecom/contracts check-types && pnpm --filter @sitehaus-ecom/validation check-types`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/contracts/src/variants/variants.contract.ts packages/validation/src/variants.schemas.ts
git commit -m "feat(contracts): syncVariations route"
```

---

### Task 5: Gateway controller route

**Files:**

- Modify: `apps/gateway/src/products/products-admin.controller.ts`

**Interfaces:**

- Consumes: `contract.variant.syncVariations` (Task 4); TCP patterns `catalog.variations.sync` (Task 3) and `catalog.products.get` (existing).
- Produces: HTTP `PUT /v1/admin/products/:productId/variations`.

- [ ] **Step 1: Add the handler** (mirror the existing methods in this controller):

```ts
  @CommercePerm("products:write")
  @UseGuards(AdminStoreGuard)
  @TsRestHandler(contract.variant.syncVariations)
  syncVariations(@Req() req: Request) {
    return tsRestHandler(contract.variant.syncVariations, async ({ params, body }) => {
      const sync = await firstValueFrom(
        this.commerce.send("catalog.variations.sync", {
          productId: params.productId,
          storeId: req.store!.id,
          ...body,
        }),
      );
      const product = await firstValueFrom(
        this.commerce.send("catalog.products.get", { id: params.productId, storeId: req.store!.id }),
      );
      return { status: 200 as const, body: { product, blocked: (sync as { blocked: unknown[] }).blocked } };
    });
  }
```

> This controller currently injects only `COMMERCE_SERVICE`, which serves both `catalog.variations.sync` and `catalog.products.get` — no new injection needed. If `contract.variant` isn't yet imported here, it is exposed via the same `contract` import already in the file.

- [ ] **Step 2: Verify the route is registered.** Confirm `VariantsController`/products controller is in `apps/gateway/src/products/products.module.ts`; the method lives on the existing `ProductsController`, so no module change is required.

- [ ] **Step 3: Typecheck + build the two services**

Run: `pnpm --filter @sitehaus-ecom/gateway check-types && pnpm --filter @sitehaus-ecom/commerce check-types`
Expected: clean.

- [ ] **Step 4: Manual smoke (optional but recommended).** With `docker-compose.dev.yml` up, `curl -XPUT` the endpoint against a seeded product (auth cookie required) and confirm a plain product yields one variant and a 2-dimension payload yields the full grid.

- [ ] **Step 5: Commit**

```bash
git add apps/gateway/src/products/products-admin.controller.ts
git commit -m "feat(gateway): PUT products/:id/variations route"
```

---

## Phase 2 — Frontend rebuild (`~/Dev/sitehaus/apps/commerce`)

_No test runner here — verify each task with `pnpm --filter commerce check-types`, `pnpm --filter commerce lint`, and the manual steps. Run the app with `cd apps/commerce && pnpm dev` (`:3004`, `commerce.localhost` via Caddy)._

### Task 6: Frontend combination helpers + lib client

**Files:**

- Create: `apps/commerce/lib/combinations.ts`
- Modify: `apps/commerce/lib/commerce.ts` (add `SyncVariationsBody`, `SyncVariationsResult`, `syncVariations()`)

**Interfaces:**

- Produces:
  - `generateCombinations(dims): string[][]`, `rowCount(dims): number`, `pluralize(word: string): string` (naive: append "s" unless it already ends in "s").
  - `syncVariations(productId, body: SyncVariationsBody): Promise<SyncVariationsResult>`.

- [ ] **Step 1: Create `apps/commerce/lib/combinations.ts`**

```ts
export type Dimension = { name: string; values: string[] };

export function generateCombinations(dims: Dimension[]): string[][] {
  return dims
    .filter((d) => d.values.length)
    .reduce<string[][]>((acc, d) => acc.flatMap((c) => d.values.map((v) => [...c, v])), [[]]);
}

export function rowCount(dims: Dimension[]): number {
  return dims.reduce((n, d) => n * Math.max(d.values.length, 0), 1);
}

export function pluralize(word: string): string {
  const w = word.trim();
  if (!w) return w;
  return /s$/i.test(w) ? w : `${w}s`;
}
```

- [ ] **Step 2: Add the client fn + types to `apps/commerce/lib/commerce.ts`** (after the Options section, ~line 252):

```ts
// ─── Variations (bulk sync) ────────────────────────────────────────────────────
export type SyncVariationsBody = {
  dimensions: { name: string; values: string[] }[];
  rows: {
    values: string[];
    priceCents: number;
    stock: number;
    sku?: string | null;
    isActive?: boolean;
    compareAtCents?: number | null;
  }[];
};
export type SyncVariationsResult = {
  product: ProductDetail;
  blocked: { variantId: string; name: string }[];
};
export const syncVariations = (productId: string, body: SyncVariationsBody) =>
  request<SyncVariationsResult>(`/v1/admin/products/${productId}/variations`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
```

- [ ] **Step 3: Verify**

Run: `cd ~/Dev/sitehaus && pnpm --filter commerce check-types`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/commerce/lib/combinations.ts apps/commerce/lib/commerce.ts
git commit -m "feat(commerce-ui): combinations helpers + syncVariations client"
```

---

### Task 7: `use-variations` hook

**Files:**

- Create: `apps/commerce/app/[storeSlug]/(admin)/products/[id]/_components/use-variations.ts`

**Interfaces:**

- Consumes: `ProductDetail`, `syncVariations`, `SyncVariationsBody` (Task 6); `generateCombinations`, `rowCount` (Task 6); React Query `["product", id]`.
- Produces: hook `useVariations(product: ProductDetail)` returning:

  ```ts
  {
    hasVariations: boolean;            // dimensions.length > 0
    dimensions: Dimension[];           // editable local state
    rows: EditableRow[];               // one per current combination, with price/stock/sku/isActive
    setDimensions(next: Dimension[]): void;   // regenerates rows, preserving matching price/stock/sku
    setRow(key: string, patch: Partial<EditableRow>): void;
    removeRow(key: string): void;
    enable(firstDimensionName: string): void; // turn a plain product into 1-dimension
    disableToPlain(): void;            // collapse to a single row
    count: number;                     // rowCount(dimensions)
    save(): void;                      // calls syncVariations, invalidates ["product", id], toasts blocked[]
    isSaving: boolean;
    dirty: boolean;
  }
  ```

  where `EditableRow = { key: string; values: string[]; priceCents: number; stock: number; sku: string; isActive: boolean }` and `key = JSON.stringify(values)`.

- [ ] **Step 1: Implement the hook.** Seed local state from `product.options`/`product.variants` (map each variant's `optionValues` → ordered values by option `sortOrder`; a plain product → `dimensions: []`, one row from the single variant). On `setDimensions`, call `generateCombinations`, and for each new combo reuse the price/stock/sku from the old row with the same `key` (else default price from the first existing row, stock 0). `save()` builds `SyncVariationsBody` and calls `syncVariations`, then `qc.invalidateQueries(["product", id])` and, if `blocked.length`, `toast.warning` listing the names that couldn't be removed.

```ts
"use client";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { syncVariations, type ProductDetail, type SyncVariationsBody } from "@/lib/commerce";
import { generateCombinations, rowCount, type Dimension } from "@/lib/combinations";

export type EditableRow = {
  key: string;
  values: string[];
  priceCents: number;
  stock: number;
  sku: string;
  isActive: boolean;
};
const keyOf = (values: string[]) => JSON.stringify(values);

function seed(product: ProductDetail): { dimensions: Dimension[]; rows: EditableRow[] } {
  const options = [...product.options].sort((a, b) => a.sortOrder - b.sortOrder);
  const dimensions: Dimension[] = options.map((o) => ({
    name: o.name,
    values: [...o.values].sort((a, b) => a.sortOrder - b.sortOrder).map((v) => v.value),
  }));
  const rows: EditableRow[] = product.variants.map((v) => {
    const values = options
      .map((o) => v.optionValues.find((ov) => ov.optionId === o.id)?.value ?? "")
      .filter((x) => x !== "");
    return {
      key: keyOf(values),
      values,
      priceCents: v.priceCents,
      stock: v.stock,
      sku: v.sku ?? "",
      isActive: v.isActive,
    };
  });
  return { dimensions, rows };
}

export function useVariations(product: ProductDetail) {
  const qc = useQueryClient();
  const initial = useMemo(() => seed(product), [product]);
  const [dimensions, setDims] = useState<Dimension[]>(initial.dimensions);
  const [rowMap, setRowMap] = useState<Record<string, EditableRow>>(
    Object.fromEntries(initial.rows.map((r) => [r.key, r])),
  );
  const [dirty, setDirty] = useState(false);

  function regenerate(next: Dimension[]) {
    const combos = next.length ? generateCombinations(next) : [[]];
    const prev = rowMap;
    const defaults = Object.values(prev)[0];
    const nextMap: Record<string, EditableRow> = {};
    for (const values of combos) {
      const key = keyOf(values);
      nextMap[key] = prev[key] ?? {
        key,
        values,
        priceCents: defaults?.priceCents ?? 0,
        stock: 0,
        sku: "",
        isActive: true,
      };
    }
    setRowMap(nextMap);
    setDims(next);
    setDirty(true);
  }

  const mutation = useMutation({
    mutationFn: () => {
      const body: SyncVariationsBody = {
        dimensions,
        rows: Object.values(rowMap).map((r) => ({
          values: r.values,
          priceCents: r.priceCents,
          stock: r.stock,
          sku: r.sku || null,
          isActive: r.isActive,
        })),
      };
      return syncVariations(product.id, body);
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["product", product.id] });
      setDirty(false);
      if (res.blocked.length) {
        toast.warning(
          `Couldn't remove ${res.blocked.map((b) => b.name).join(", ")} — used in orders. Turned inactive instead.`,
        );
      } else {
        toast.success("Saved");
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  return {
    hasVariations: dimensions.length > 0,
    dimensions,
    rows: Object.values(rowMap),
    count: rowCount(dimensions),
    dirty,
    isSaving: mutation.isPending,
    setDimensions: regenerate,
    setRow: (key: string, patch: Partial<EditableRow>) => {
      setRowMap((m) => ({ ...m, [key]: { ...m[key], ...patch } }));
      setDirty(true);
    },
    removeRow: (key: string) => {
      setRowMap((m) => {
        const n = { ...m };
        delete n[key];
        return n;
      });
      setDirty(true);
    },
    enable: (firstName: string) => regenerate([{ name: firstName, values: [] }]),
    disableToPlain: () => regenerate([]),
    save: () => mutation.mutate(),
  };
}
```

- [ ] **Step 2: Verify** — `pnpm --filter commerce check-types`. Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add "apps/commerce/app/[storeSlug]/(admin)/products/[id]/_components/use-variations.ts"
git commit -m "feat(commerce-ui): useVariations state hook"
```

---

### Task 8: `pricing-fields` (plain product editor)

**Files:**

- Create: `.../[id]/_components/pricing-fields.tsx`

**Interfaces:**

- Consumes: nothing new. Renders three inputs (Price, In stock, SKU) bound to the single plain row via props `{ row, onChange }` where `row` is the `EditableRow` for `values: []`.
- Produces: `<PricingFields row onChange />`.

- [ ] **Step 1: Implement** a controlled card with Price / In stock / SKU inputs (dollars↔cents via the existing `formatCents`/parse helpers pattern from `variant-dialog.tsx:41-47`), calling `onChange(patch)` on edit.
- [ ] **Step 2: Verify** — `pnpm --filter commerce check-types`.
- [ ] **Step 3: Commit** — `git commit -m "feat(commerce-ui): plain-product pricing fields"`.

---

### Task 9: `dimension-editor` (name the things that vary)

**Files:**

- Create: `.../[id]/_components/dimension-editor.tsx`

**Interfaces:**

- Consumes: `Dimension` (Task 6), `useVariations` outputs (`dimensions`, `setDimensions`). Enforces **max 3 dimensions** (hide "add another" at 3) and the **> 25 rows confirm** (via `rowCount`, using a shadcn `Dialog` confirm before applying a change that crosses the threshold).
- Produces: `<DimensionEditor dimensions onChange={(next) => setDimensions(next)} />`.

- [ ] **Step 1: Implement.** Each dimension = a name input ("What varies?" placeholder) + a tag-style value list with "+ add a <singular>" (use `pluralize` for the section header, singular for the add button). "+ Also varies by…" adds a dimension; hidden once `dimensions.length === 3`. When adding a value/dimension would push `rowCount(next) > 25`, open a confirm dialog ("This creates N rows — continue?") before calling `onChange`.
- [ ] **Step 2: Verify** — `check-types` + `lint`.
- [ ] **Step 3: Commit** — `git commit -m "feat(commerce-ui): dimension editor (max 3, row-count guard)"`.

---

### Task 10: `combinations-table` (the editable rows)

**Files:**

- Create: `.../[id]/_components/combinations-table.tsx`

**Interfaces:**

- Consumes: `rows`, `dimensions`, `setRow`, `removeRow`, `count` from `useVariations`.
- Produces: `<CombinationsTable ... />` — a table with one column per dimension (headers = dimension names), then Price / Stock / SKU / (remove). Shows a live "N rows" count. Inline-editable cells (reuse the dollars↔cents pattern). The remove button deletes the row from local state (final delete happens on save; the backend guard + `blocked` toast handles order-protected rows).

- [ ] **Step 1: Implement** the table. For a plain product (`dimensions.length === 0`) this component is not rendered — `PricingFields` is used instead (see Task 11).
- [ ] **Step 2: Verify** — `check-types` + `lint`.
- [ ] **Step 3: Commit** — `git commit -m "feat(commerce-ui): combinations table"`.

---

### Task 11: `variations-card` container + wire into the product page + delete dead code

**Files:**

- Create: `.../[id]/_components/variations-card.tsx`
- Modify: `.../[id]/page.tsx` (replace `<VariantsCard .../>` usage)
- Delete: `.../[id]/_components/variants-card.tsx`, `.../[id]/_components/options-card.tsx`, `.../[id]/_components/variant-dialog.tsx`, `.../[id]/_components/option-dialog.tsx`

**Interfaces:**

- Consumes: `useVariations` (Task 7), `PricingFields` (8), `DimensionEditor` (9), `CombinationsTable` (10).
- Produces: `<VariationsCard product={ProductDetail} />`.

- [ ] **Step 1: Implement `variations-card.tsx`.** A `SectionCard` titled "Pricing & stock" that:
  - reads `useVariations(product)`;
  - shows a checkbox **"Sold in more than one size, color, or style"** bound to `hasVariations` (checking it calls `enable("")` and focuses the name field; unchecking opens a confirm then `disableToPlain()`);
  - when unchecked → renders `<PricingFields>` for the single row;
  - when checked → renders `<DimensionEditor>` + `<CombinationsTable>`;
  - shows a **Save** button (disabled unless `dirty`) calling `save()`.
  - Never renders the words "variant" or "option".

- [ ] **Step 2: Wire into the page.** In `page.tsx`, replace the import and usage of `VariantsCard` with `VariationsCard` (it already receives the full `product`; drop the separate `variants`/`options` props):

```tsx
import { VariationsCard } from "./_components/variations-card";
// ...
<VariationsCard product={product} />;
```

- [ ] **Step 3: Delete the four dead components** listed above and remove any now-unused imports/exports (`grep` for `VariantsCard`, `OptionsCard`, `VariantDialog`, `OptionDialog` and ensure no references remain).

- [ ] **Step 4: Verify**

Run: `pnpm --filter commerce check-types && pnpm --filter commerce lint`
Expected: clean, with no dangling references to the deleted files.

- [ ] **Step 5: Manual verification (the real test).** With the backend (`docker-compose.dev.yml`) and `pnpm dev` running, on `commerce.localhost`:
  1. Open a **plain** product → see Price/Stock/SKU, no jargon. Edit price, Save → reload shows the new price.
  2. Check "Sold in more than one…" → name "Size", add "60 capsules"/"90 capsules", set prices, Save → reload shows two rows.
  3. "+ Also varies by" → "Color": Red/Blue → the grid auto-fills to 4 rows; a live "4 rows" count shows. Save → reload persists.
  4. Add values until the count would exceed 25 → confirm dialog appears.
  5. Try to remove a combination that has a real order → after Save, the warning toast lists it and it stays (turned inactive).
  6. Confirm the third "Also varies by" disappears once 3 dimensions exist.

- [ ] **Step 6: Commit**

```bash
git add -A "apps/commerce/app/[storeSlug]/(admin)/products"
git commit -m "feat(commerce-ui): plain-language variations editor; remove options/variants jargon UI"
```

---

## Self-review notes (already reconciled)

- **Spec coverage:** vocabulary (Tasks 9–11), plain default (8, 11), single/multi-dimension + autofill (6, 7, 10), 3-dimension cap + live counter + 25-row confirm (9), no schema change / bulk endpoint (1–5), delete-guard + `blocked` surfacing (3, 7, 11), dead-code cleanup (11), testing where a harness exists (backend 1–3). ✅
- **Type consistency:** `SyncVariationsBody`/`SyncVariationsResult` (frontend) mirror `syncVariationsSchema`/`syncVariationsResultSchema` (backend); `EditableRow.key = JSON.stringify(values)` matches backend `keyOf`. ✅
- **Known follow-ups (out of scope):** frontend has no unit-test harness — the combination logic is duplicated (10 lines) between `apps/commerce/lib/combinations.ts` and the backend `variations.logic.ts` because the two live in separate repos; authoritative correctness is the backend's. Bulk price/stock rules, per-variant images, and drag-reorder are deferred per the spec.
