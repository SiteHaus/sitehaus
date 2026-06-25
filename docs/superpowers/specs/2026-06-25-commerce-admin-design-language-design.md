# Commerce Admin Design Language — Design Spec

**Date:** 2026-06-25
**Status:** Approved (brainstorm) → ready for implementation plan
**Scope:** `apps/commerce` (Commerce admin UI, port 3004) — the entire `[storeSlug]/(admin)` surface
**Branch:** `release/commerce-flagship`

## Problem

The Orders page was redesigned into a distinctive warm-editorial look (StatCard filter
row, branded status badges, eyebrow + Fraunces header, revenue sparkline). The other
eight admin surfaces never got that treatment, so the app reads as two different
products. The brand _palette_ (parchment + terracotta) and _fonts_ (Fraunces / Inter
Tight / JetBrains Mono) already apply app-wide via `globals.css` CSS variables — the gap
is **composition language**: there is no shared, elevated set of page-level primitives, so
each page re-hand-rolls its header, badges, empty states, and table+skeleton+pagination
boilerplate, diverging as it goes (e.g. `rounded-lg` vs `rounded-xl`, `OrderStatusBadge`
vs products `StatusBadge`, bespoke orders header vs the shared `PageHero`).

## Goal

Elevate the Orders-page styling into a **reusable commerce admin design language** and roll
it across every `(admin)` surface, so the app feels like a single, genuine SiteHaus
product. Aesthetic direction: **warm editorial / boutique** — lean into the existing
parchment + Fraunces brand (serif display headings, warm cards, generous whitespace, calm
density). Motion: **tasteful and restrained** (150–200ms fades, skeleton→content
crossfade, hover-lift / press), defined as reusable tokens — no counters or stagger.

## Decisions (locked during brainstorm)

| Question              | Decision                                                                                                                                                                                                                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aesthetic north star  | Warm editorial / boutique (lean into existing tokens)                                                                                                                                                                                                                               |
| Rollout scope         | Everything in `(admin)`: list pages + detail/form pages + dialogs + app shell                                                                                                                                                                                                       |
| Motion appetite       | Tasteful & restrained, as reusable tokens                                                                                                                                                                                                                                           |
| Where primitives live | **Approach A** — commerce-local design kit in `apps/commerce/components/ui/`, composing existing `packages/ui/base` shadcn primitives. No changes to shared `packages/ui` components (keeps dashboard/iam unaffected); clean promotion path later if they want the same feel.       |
| List tables           | **Light editorial table shell** over `base/table` (keeps row-click-to-open + custom cells + inline actions). Reuse the shared `data-table-pagination` sub-component inside it. Do **not** adopt the heavyweight TanStack `shared/data-table` (denser data-grid feel, different UX). |

## Reuse-first principle

This is mostly **thin wrappers + a token layer**, not net-new components. Build on what
exists:

- `packages/ui/base/stat-card` — already ships hover-lift + active/alert states + Fraunces value. Used as-is by `FilterCards`.
- `packages/ui/base/empty` — full shadcn Empty set (`Empty`, `EmptyHeader`, `EmptyMedia`, `EmptyTitle`, `EmptyDescription`, `EmptyContent`). `EmptyState` is a thin wrapper over it.
- `packages/ui/base/badge`, `base/table`, `base/card`, `base/pagination`, `base/dialog`, `base/skeleton` — composed by the kit.
- `packages/ui/shared/data-table/data-table-pagination` — reused inside `DataTableShell`.
- Existing commerce pieces folded in: orders `OrderFilterCards` → generalized `FilterCards`; orders `OrderStatusBadge` + products `StatusBadge` → unified `StatusBadge`; `lib/order-display.ts` status tones → kit `status-tone.ts`.
- The local `components/page-hero.tsx` wrapper is **superseded** by the new `PageHeader` (the shared `packages/ui/shared/page-hero` stays for dashboard/iam).

## The design kit — `apps/commerce/components/ui/`

One component per file. All compose `packages/ui/base/*`.

| File                        | Component        | Responsibility                                                                                                                                                                                                                                 |
| --------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `page-header.tsx`           | `PageHeader`     | `eyebrow` (default "Store") + `font-display` title + `subtitle?` + `actions?` (right buttons) + `aside?` (right widget slot, e.g. RevenueSummary). Handles the page top offset. Replaces orders' bespoke header and commerce `PageHero` usage. |
| `status-badge.tsx`          | `StatusBadge`    | One token-driven badge: `tone` × `label` × optional `dot`. Built on `base/badge`.                                                                                                                                                              |
| `status-tone.ts`            | (helper)         | Maps domain statuses (order/product/etc.) → tone. Single source for status→tone.                                                                                                                                                               |
| `empty-state.tsx`           | `EmptyState`     | `icon` + `title` + `description?` + `action?`. Thin wrapper over `base/empty`.                                                                                                                                                                 |
| `data-table-shell.tsx`      | `DataTableShell` | Table container (`rounded-xl border`) + header + skeleton-loading rows + empty state + pagination footer. Wraps `base/table` + reuses shared `data-table-pagination`. Keeps row-click + custom cell render.                                    |
| `filter-cards.tsx`          | `FilterCards`    | Generalized StatCard filter row: `items[{key,label,count,icon?,tone?}]` + `active` + `onSelect`. Built on `base/stat-card`.                                                                                                                    |
| `section-card.tsx`          | `SectionCard`    | Titled card section (title + description? + children + footer actions?) for detail/form pages. Built on `base/card`.                                                                                                                           |
| `motion.ts` + `globals.css` | (tokens)         | Motion tokens + utility classes: fade-in, skeleton→content crossfade, hover-lift, press.                                                                                                                                                       |

## Visual tokens

- **Radius:** `rounded-xl` for cards/tables/containers (resolve the `rounded-lg`↔`rounded-xl` split), `rounded-full` for badges/avatars.
- **Type roles:** `font-display` (Fraunces) → page titles, StatCard values, SectionCard titles · `font-body` (Inter Tight) → default · `font-mono` (JetBrains) → IDs, SKUs, order numbers, data figures. **Eyebrow** = `text-[11px] font-semibold tracking-[0.14em] uppercase text-primary`.
- **Status tones (warm-mapped, defined once):** `active`→terracotta/primary · `success`→sage (chart-2) · `info`→clay (chart-3) · `warning`→warm gold (chart-5) · `danger`→rose/destructive (chart-4 / destructive) · `neutral`→muted. Each tone = bg tint + foreground + dot color.
- **Density:** keep page padding `px-4 md:px-6 py-6`, `space-y-6` section rhythm, `mb-6` header.
- **Motion:** `--motion-fast: 150ms`, `--motion-base: 200ms`, soft easing; fade-in on load, skeleton→content crossfade, gentle hover/press. No counters / no stagger.

## Page scaffold pattern

```
<PageHeader eyebrow title subtitle actions? aside? />
[ FilterCards | Tabs ]?          ← segment filters
[ toolbar: search / filters ]?
< DataTableShell />              ← list pages
   — or —
< SectionCard > stack            ← detail / form pages (2-col grid where it fits)
```

Page files stay thin (data + role); composition via the kit; one component per file.

## Per-surface application

| Surface                                                          | Composition                                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| orders, products, collections, inventory, shipping, webhooks     | PageHeader + (FilterCards \| Tabs) + DataTableShell                                        |
| dashboard                                                        | PageHeader + StatCard grid + chart SectionCards + recent-orders / low-stock SectionCards   |
| analytics                                                        | PageHeader + chart SectionCards + top-products via DataTableShell                          |
| settings                                                         | PageHeader + SectionCard form stack                                                        |
| detail pages (`product/[id]`, `orders/[id]`, `collections/[id]`) | PageHeader (+ back) + SectionCard two-column grid                                          |
| dialogs                                                          | Standardize DialogContent sizing + footer button order + motion (light pass, not rebuilds) |
| app shell (`(admin)/layout.tsx` + `components/sidebar`)          | Warm topbar, terracotta active nav states, store-name brand — restrained polish            |

## Rollout phasing (→ implementation plan)

1. **Kit + tokens** — build the 7 primitives + motion/status tokens in `globals.css`; convert **orders** as the reference page (proves the kit, no other page changes).
2. **List pages** — products, collections, inventory, shipping, webhooks, analytics, dashboard.
3. **Detail / form pages** — product / order / collection detail + settings.
4. **Dialogs + shell polish.**

Each phase is independently shippable and reviewable.

## Verification

No UI test suite exists (audit F-024) and adding one is out of scope. Per phase:

- `pnpm check-types` + `pnpm lint` + `pnpm build` green.
- Per-page visual QA checklist (header, empty state, loading skeleton, hover/motion, dark mode).
- _Nice-to-have (not required):_ lightweight render tests for `DataTableShell`'s loading/empty branches, since those carry real logic.

## Non-goals

- No changes to shared `packages/ui` components (no blast radius to dashboard/iam).
- No adoption of TanStack `shared/data-table` for commerce lists.
- No new test framework / suite.
- No palette or font changes (tokens already exist in `globals.css`).
- No backend / data-layer changes — this is presentation only.
