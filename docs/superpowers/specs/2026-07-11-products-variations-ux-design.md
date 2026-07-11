# Products & Variations UX Redesign — Design Spec

**Date:** 2026-07-11
**App:** `apps/commerce` (Store Admin UI) + `sitehaus-commerce` gateway/commerce service
**Status:** Approved design — ready for implementation plan

## Problem

The current product editor exposes the raw ecommerce data model to the merchant:
"**Options**" (Color, Size) with "**values**", _plus_ "**Variants**" created one at a time in
a modal where you hand-pick a value per option. Even the team that built it found it
unintuitive. Our merchants are non-technical (clinics, construction/local businesses, SMBs
— see the Dashboard philosophy: "plain language everywhere, business owners not
developers") and have no "options vs. variants" mental model.

Specific failures today:

- **Jargon-first, two-level model.** You must reason about "options" _and_ "variants" and
  reconcile them yourself. The order of operations is ambiguous ("Add Variant" vs. "add
  options first?").
- **No auto-generation.** A Size×Color product means hand-building every combination in a
  modal — _below_ the industry standard (Shopify/Woo/Etsy all auto-generate).
- **The simple product is muddled.** A product with one price/SKU/stock still forces the
  merchant to think about "variants."
- **Dead/duplicated code.** `options-card.tsx` is orphaned; `variants-card.tsx`
  re-implements the same option UI inline.

## Goals

1. Make product setup intuitive for people who don't think in ecommerce terms.
2. **Remove the "options/variants" vocabulary from the UI entirely** — speak in the
   seller's own words.
3. Keep the common cases trivial: a plain product (no variation) and a single-dimension
   product.
4. Auto-generate combinations for multi-dimension products (**up to 3 dimensions**), with a
   **live row-count guardrail** instead of an arbitrary cap.
5. **Screen-only rebuild** — no DB schema change / migration. Backend gains one _additive_
   bulk-sync endpoint.

## Non-goals

- No changes to storefront rendering, cart, or checkout.
- No database schema/enum migration.
- No 4+ dimensions.
- No bulk CSV import, per-variant images, or drag-reorder of rows (future).
- The **New Product** page stays minimal (name / description / status). _All_ variation
  setup happens on the product detail page (progressive disclosure).

## Vocabulary (the core of the redesign)

The UI never says "variant" or "option." It speaks in the seller's words.

| Internal / DB term (kept) | Shown to the merchant                                   |
| ------------------------- | ------------------------------------------------------- |
| product_option            | the thing that varies, **named by the seller** ("Size") |
| product_option_value      | just the label they type ("60 capsules", "Red")         |
| product_variant           | a **row** in the table (a sellable combination)         |

- A product has **price / stock / SKU** by default.
- One checkbox reveals variation: **"Sold in more than one size, color, or style."**
- The seller names each thing that varies. Internally we call this a **dimension**; the
  word is never shown. The table's columns are the dimension names; section headings derive
  from them ("Sizes", or "Sizes & colors" for two).

## UX states

### State 0 — Plain product (default)

Product detail page shows a **Pricing & stock** card: Price, In stock, SKU (optional), and
an unchecked checkbox _"Sold in more than one size, color, or style."_
Backed by exactly **one default variant, zero options**.

### State 1 — Varies by one thing

Check the box → **"What varies?"** input → seller types "Size". The section becomes
**"Sizes"** with an inline table `[ Size | Price | Stock | SKU | ⋯ ]`, rows added via
**"+ add a size"**. Each row is a variant carrying that one value. A link offers
**"+ Also varies by color, style, …"**.
Unchecking the box asks for confirmation and merges back to a single price/stock (retaining
the first row's price/stock/SKU).

### States 2–3 — Varies by two or three things

Adding a dimension (e.g. Color: Red, Blue) **auto-generates the cartesian product** of all
dimensions' values. The table grows one column per dimension:
`[ Size | Color | Price | Stock | SKU ]`. A **live row counter** is always visible; a
confirm step appears when an action would create more than **25 rows** (tunable). Rows are
editable inline; the merchant can **delete combinations they don't sell** and **bulk-set**
price/stock. The **"add another"** affordance disappears at **3** dimensions.

## Data model mapping (no schema change)

- dimension ⇄ `product_options` (name, sortOrder)
- dimension value ⇄ `product_option_values` (value, sortOrder)
- table row ⇄ `product_variants` (name auto-built from the value labels joined by " / ",
  priceCents, stock, sku, `optionValueIds` = one value per dimension)
- plain product ⇄ exactly one variant, zero options

The storefront, cart, checkout, and order/inventory logic are unchanged — they read the
same tables.

## Backend: additive bulk-sync endpoint

Client-side orchestration of N combinations means N create/update/delete calls — slow,
non-atomic, and hard to keep consistent when regenerating. Add **one endpoint**:

`PUT /v1/admin/products/:id/variations` (ts-rest contract → gateway → commerce TCP handler)

- **Body:** the desired dimensions (name + ordered values) and the row set (price / stock /
  sku keyed by the combination of value IDs).
- **Behavior (single transaction):** upsert options & values; create missing variants;
  update changed ones; delete removed ones — **respecting the existing "variant has active
  orders" guard**, returning which rows could not be removed so the UI can explain it.
- **No schema change** — it operates on existing tables and centralizes generation +
  validation server-side.

_Smaller first cut (fallback):_ reuse the existing per-entity endpoints
(`createOption`/`createOptionValue`/`createVariant`/…) with client orchestration. Works, but
slower and non-atomic. **Recommendation: build the bulk endpoint.**

## Combination generation (pure logic)

A pure function `generateCombinations(dimensions: { name, values[] }[]) => rows[]`
(cartesian product), unit-tested independently. Used both to preview the live row count and
to build the sync payload. When regenerating, it **preserves existing rows'
price/stock/sku** by matching on the set of value IDs.

## Component breakdown (one component per file, per `apps/commerce` standards)

- `variations-card.tsx` — container (replaces `VariantsCard`); holds the checkbox and
  renders either the plain price/stock fields (State 0) or the dimension editor + table.
- `pricing-fields.tsx` — plain product price/stock/SKU; reused as the single-row editor.
- `dimension-editor.tsx` — the "what varies" controls: add / name / reorder dimensions and
  their values (max 3); emits dimension state.
- `combinations-table.tsx` — editable rows, live counter, inline edit, delete, bulk actions.
- `use-variations.ts` — hook: dimensions/rows state, generation, dirty tracking, the sync
  mutation (bulk endpoint), and query invalidation.
- `lib/combinations.ts` — pure `generateCombinations` + row-match/merge + plural helper.
- **Delete** the dead `options-card.tsx`; **retire** `option-dialog.tsx` and
  `variant-dialog.tsx` (replaced by inline editing). Preserve the variant-delete guard.

## Guardrails & error handling

- **Max 3 dimensions**; "add another" hidden once 3 exist.
- **Live row count always visible**; confirm dialog when an action would create > 25 rows.
- **Validation:** each dimension needs a name + ≥1 value; values unique within a dimension;
  price required per row; SKU optional and unique if provided (existing rule).
- **Delete blocked by orders:** the backend guard already blocks removing a variant with
  active orders — surface inline: "used in orders — deactivate instead."
- **Removing a dimension** warns it will collapse/merge rows; confirm.
- **Toggling variation off** on a multi-row product confirms, then keeps one row as the
  plain price/stock.

## Testing

- **Unit:** `generateCombinations` (0/1/2/3 dims, empty values, row counts); row-merge
  preserves existing price/stock; plural helper.
- **Backend:** bulk-sync reconcile (create/update/delete diff, active-order guard,
  transactional rollback).
- **Component:** checkbox reveal; adding dimensions up to 3 then capped; live counter;
  delete-blocked messaging.
- Keep existing product/variant tests and any e2e green.

## Rollout

Purely additive backend endpoint + a screen replacement; **no migration**. Existing products
(with options/variants already) render in the new UI automatically from the same data. Ship
through the normal deploy. Verify against a plain product, a one-dimension product, and a
two-dimension product.

## Future (not now)

3-dimension bulk price/stock rules, per-variant images, CSV import, drag-reorder of rows.
