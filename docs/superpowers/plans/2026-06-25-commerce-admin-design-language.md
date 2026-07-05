# Commerce Admin Design Language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Roll the Orders-page warm-editorial styling into a reusable commerce admin design kit and apply it across every `[storeSlug]/(admin)` surface so the app reads as one SiteHaus product.

**Architecture:** A commerce-local design kit in `apps/commerce/components/ui/` (one component per file) composes existing `@site-haus/ui` `base/*` shadcn primitives. Brand palette/fonts already live in `apps/commerce/app/globals.css`; this adds a token layer (motion + status tones) plus 7 composed primitives, then converts pages to use them in four phases. No changes to shared `packages/ui` (dashboard/iam unaffected).

**Tech Stack:** Next.js 15 (App Router, all `"use client"`), React 19, Tailwind CSS 4, `@site-haus/ui` (shadcn), `@tanstack/react-query`, `lucide-react`, `sonner`.

## Global Constraints

- One component per file. Page files stay thin (data + role); composition lives in `_components/` or the kit.
- Build on existing `@site-haus/ui/components/base/*` — do **not** add net-new primitives that duplicate shadcn, and do **not** modify any file under `packages/ui`.
- Do **not** adopt the TanStack `@site-haus/ui/components/shared/data-table` for commerce list pages. Its `data-table-pagination` is TanStack-coupled (`Table<TData>`) and is **not** reused here.
- Aesthetic: warm-editorial. Radius `rounded-xl` for cards/tables/containers, `rounded-full`/badge default for pills. Eyebrow = `text-[11px] font-semibold tracking-[0.14em] uppercase text-primary`.
- Type roles: `.font-display` (Fraunces) for page titles, StatCard values, SectionCard titles; default body is Inter Tight; `.font-numeric-id` (JetBrains Mono) for IDs/SKUs/order numbers.
- Motion: tasteful, 150–200ms, via the tokens added in Task 1. No counters, no list-stagger.
- Status tone names are fixed: `active | success | info | warning | danger | neutral`.
- Per-phase gate: `pnpm --filter @site-haus/commerce check-types`, `pnpm --filter @site-haus/commerce lint`, `pnpm --filter @site-haus/commerce build` all green. (If the package name differs, use the name in `apps/commerce/package.json`.)
- Commit messages: gitmoji prefix, no `Co-Authored-By` trailer. Work on branch `release/commerce-flagship`.

---

## Phase 1 — Design kit + tokens + Orders reference

### Task 1: Motion + status-tone tokens

**Files:**

- Modify: `apps/commerce/app/globals.css` (append after line 149, the font block)

- [ ] **Step 1: Append motion + tone tokens and utility classes**

Append to `apps/commerce/app/globals.css`:

```css
/* ── Motion tokens ──────────────────────────────────────────────── */
:root {
  --motion-fast: 150ms;
  --motion-base: 200ms;
  --ease-out: cubic-bezier(0.22, 0.61, 0.36, 1);
}

@keyframes sh-fade-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.sh-fade-in {
  animation: sh-fade-in var(--motion-base) var(--ease-out) both;
}
@media (prefers-reduced-motion: reduce) {
  .sh-fade-in {
    animation: none;
  }
}
.sh-lift {
  transition:
    transform var(--motion-base) var(--ease-out),
    box-shadow var(--motion-base) var(--ease-out);
}
.sh-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 22px oklch(0.4 0.04 50 / 0.1);
}

/* ── Status tones ───────────────────────────────────────────────── */
.tone-active {
  --tone: var(--chart-1);
}
.tone-success {
  --tone: var(--chart-2);
}
.tone-info {
  --tone: var(--chart-3);
}
.tone-warning {
  --tone: var(--chart-5);
}
.tone-danger {
  --tone: var(--chart-4);
}
.tone-neutral {
  --tone: var(--muted-foreground);
}

.status-badge {
  background: color-mix(in oklch, var(--tone) 12%, transparent);
  color: color-mix(in oklch, var(--tone) 72%, var(--foreground));
  border-color: color-mix(in oklch, var(--tone) 30%, transparent);
}
```

- [ ] **Step 2: Verify the app still builds**

Run: `pnpm --filter @site-haus/commerce build`
Expected: build succeeds (CSS is valid; no usage yet).

- [ ] **Step 3: Commit**

```bash
git add apps/commerce/app/globals.css
git commit -m ":lipstick: commerce — motion + status-tone design tokens"
```

---

### Task 2: `status-tone.ts` helper

**Files:**

- Create: `apps/commerce/components/ui/status-tone.ts`

**Interfaces:**

- Produces: `type Tone = "active" | "success" | "info" | "warning" | "danger" | "neutral"`; `toneClass(tone: Tone): string` returning the `tone-*` className; `orderTone(s: OrderStatus): Tone`; `productTone(s: ProductStatus): Tone`.

- [ ] **Step 1: Create the helper**

```ts
import type { OrderStatus, ProductStatus } from "@/lib/commerce";

export type Tone = "active" | "success" | "info" | "warning" | "danger" | "neutral";

export function toneClass(tone: Tone): string {
  return `tone-${tone}`;
}

const ORDER_TONE: Record<OrderStatus, Tone> = {
  pending: "neutral",
  confirmed: "active",
  shipped: "info",
  delivered: "success",
  failed: "danger",
  refunded: "warning",
  cancelled: "danger",
};
export function orderTone(s: OrderStatus): Tone {
  return ORDER_TONE[s];
}

const PRODUCT_TONE: Record<ProductStatus, Tone> = {
  active: "success",
  draft: "warning",
  archived: "neutral",
};
export function productTone(s: ProductStatus): Tone {
  return PRODUCT_TONE[s];
}
```

> If `ProductStatus`'s union differs from `active | draft | archived`, match the exact members exported from `@/lib/commerce` (check `apps/commerce/lib/commerce.ts`) and map each to a sensible tone.

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @site-haus/commerce check-types`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/commerce/components/ui/status-tone.ts
git commit -m ":sparkles: commerce — status-tone helper (single status→tone source)"
```

---

### Task 3: `StatusBadge`

**Files:**

- Create: `apps/commerce/components/ui/status-badge.tsx`

**Interfaces:**

- Consumes: `Tone`, `toneClass` (Task 2); `Badge` from `@site-haus/ui/components/base/badge`.
- Produces: `StatusBadge({ tone, label, dot=true, className }: { tone: Tone; label: string; dot?: boolean; className?: string })`.

- [ ] **Step 1: Create the component**

```tsx
import { Badge } from "@site-haus/ui/components/base/badge";
import { cn } from "@site-haus/ui/lib/utils";
import { toneClass, type Tone } from "./status-tone";

export function StatusBadge({
  tone,
  label,
  dot = true,
  className,
}: {
  tone: Tone;
  label: string;
  dot?: boolean;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("status-badge gap-1.5 font-medium", toneClass(tone), className)}
    >
      {dot && <span className="size-1.5 rounded-full" style={{ background: "var(--tone)" }} />}
      {label}
    </Badge>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @site-haus/commerce check-types`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/commerce/components/ui/status-badge.tsx
git commit -m ":sparkles: commerce — StatusBadge (tone-driven, built on base/badge)"
```

---

### Task 4: `EmptyState`

**Files:**

- Create: `apps/commerce/components/ui/empty-state.tsx`

**Interfaces:**

- Consumes: `Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent` from `@site-haus/ui/components/base/empty`; `LucideIcon`.
- Produces: `EmptyState({ icon, title, description, action, className }: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode; className?: string })`.

- [ ] **Step 1: Create the component**

```tsx
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@site-haus/ui/components/base/empty";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle className="font-display">{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
```

- [ ] **Step 2: Type-check** — Run: `pnpm --filter @site-haus/commerce check-types` — Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/commerce/components/ui/empty-state.tsx
git commit -m ":sparkles: commerce — EmptyState (wraps base/empty)"
```

---

### Task 5: `PageHeader`

**Files:**

- Create: `apps/commerce/components/ui/page-header.tsx`

**Interfaces:**

- Produces: `PageHeader({ eyebrow="Store", title, subtitle, actions, aside, className }: { eyebrow?: string; title: string; subtitle?: React.ReactNode; actions?: React.ReactNode; aside?: React.ReactNode; className?: string })`.

- [ ] **Step 1: Create the component** (absorbs the bespoke Orders header markup)

```tsx
import { cn } from "@site-haus/ui/lib/utils";

export function PageHeader({
  eyebrow = "Store",
  title,
  subtitle,
  actions,
  aside,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex items-start justify-between gap-4", className)}>
      <div>
        <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
          {eyebrow}
        </p>
        <h1 className="font-display mt-0.5 text-3xl font-medium tracking-tight">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>}
      </div>
      {(aside || actions) && (
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {aside}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check** — Run: `pnpm --filter @site-haus/commerce check-types` — Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/commerce/components/ui/page-header.tsx
git commit -m ":sparkles: commerce — PageHeader (eyebrow + display title + actions/aside)"
```

---

### Task 6: `SectionCard`

**Files:**

- Create: `apps/commerce/components/ui/section-card.tsx`

**Interfaces:**

- Consumes: `Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter` from `@site-haus/ui/components/base/card`.
- Produces: `SectionCard({ title, description, actions, footer, children, className }: { title?: string; description?: string; actions?: React.ReactNode; footer?: React.ReactNode; children: React.ReactNode; className?: string })`.

- [ ] **Step 1: Create the component**

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "@site-haus/ui/components/base/card";
import { cn } from "@site-haus/ui/lib/utils";

export function SectionCard({
  title,
  description,
  actions,
  footer,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("rounded-xl", className)}>
      {(title || actions) && (
        <CardHeader>
          {title && <CardTitle className="font-display text-base">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
          {actions && <CardAction>{actions}</CardAction>}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}
```

> Verify the `Card*` sub-components exist with these names in `packages/ui/src/components/base/card.tsx` (they do: `Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter`).

- [ ] **Step 2: Type-check** — Run: `pnpm --filter @site-haus/commerce check-types` — Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/commerce/components/ui/section-card.tsx
git commit -m ":sparkles: commerce — SectionCard (titled card section on base/card)"
```

---

### Task 7: `FilterCards` (generalize the Orders filter row)

**Files:**

- Create: `apps/commerce/components/ui/filter-cards.tsx`

**Interfaces:**

- Consumes: `StatCard` from `@site-haus/ui/components/base/stat-card`; `Tone`, plus a tone→CSS-var map.
- Produces: `FilterCards<K extends string>({ items, active, onSelect, className }: { items: FilterItem<K>[]; active: K; onSelect: (key: K) => void; className?: string })` where `FilterItem<K> = { key: K; label: string; count?: number; tone?: Tone; alert?: boolean }`.

- [ ] **Step 1: Create the component** (generic over the key type; tone → dot color via existing chart vars)

```tsx
"use client";

import { StatCard } from "@site-haus/ui/components/base/stat-card";
import { cn } from "@site-haus/ui/lib/utils";
import type { Tone } from "./status-tone";

const TONE_VAR: Record<Tone, string> = {
  active: "var(--chart-1)",
  success: "var(--chart-2)",
  info: "var(--chart-3)",
  warning: "var(--chart-5)",
  danger: "var(--chart-4)",
  neutral: "var(--muted-foreground)",
};

export type FilterItem<K extends string> = {
  key: K;
  label: string;
  count?: number;
  tone?: Tone;
  alert?: boolean;
};

export function FilterCards<K extends string>({
  items,
  active,
  onSelect,
  className,
}: {
  items: FilterItem<K>[];
  active: K;
  onSelect: (key: K) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6", className)}>
      {items.map((it) => (
        <StatCard
          key={it.key}
          label={it.label}
          value={it.count ?? "—"}
          dotColor={it.tone ? TONE_VAR[it.tone] : undefined}
          alert={it.alert}
          active={active === it.key}
          onClick={() => onSelect(it.key)}
        />
      ))}
    </div>
  );
}
```

> The grid uses `lg:grid-cols-6`; pages with fewer cards can pass a `className` overriding `lg:grid-cols-N`.

- [ ] **Step 2: Type-check** — Run: `pnpm --filter @site-haus/commerce check-types` — Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/commerce/components/ui/filter-cards.tsx
git commit -m ":sparkles: commerce — FilterCards (generic StatCard filter row)"
```

---

### Task 8: `DataTableShell`

**Files:**

- Create: `apps/commerce/components/ui/data-table-shell.tsx`

**Interfaces:**

- Consumes: `Table, TableBody, TableCell, TableHead, TableHeader, TableRow` from `@site-haus/ui/components/base/table`; `Skeleton` from `@site-haus/ui/components/base/skeleton`; `Button` from `@site-haus/ui/components/base/button`; `EmptyState` (Task 4).
- Produces:
  - `type Column = { header: React.ReactNode; className?: string };`
  - `DataTableShell<T>({ columns, rows, renderRow, getRowKey, isLoading, empty, page, totalPages, onPageChange, className }: { columns: Column[]; rows: T[]; renderRow: (row: T) => React.ReactNode; getRowKey: (row: T) => string; isLoading?: boolean; empty: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode }; page?: number; totalPages?: number; onPageChange?: (page: number) => void; className?: string })`.
- Note: `renderRow` returns the row's `<TableCell>`s (the shell wraps them in `<TableRow>` via `getRowKey`). Pagination footer is the shell's own (Previous/Next + "Page X of Y") — the TanStack `data-table-pagination` is intentionally NOT used.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@site-haus/ui/components/base/table";
import { Skeleton } from "@site-haus/ui/components/base/skeleton";
import { Button } from "@site-haus/ui/components/base/button";
import { cn } from "@site-haus/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "./empty-state";

export type Column = { header: React.ReactNode; className?: string };

export function DataTableShell<T>({
  columns,
  rows,
  renderRow,
  getRowKey,
  isLoading,
  empty,
  page,
  totalPages,
  onPageChange,
  className,
}: {
  columns: Column[];
  rows: T[];
  renderRow: (row: T) => React.ReactNode;
  getRowKey: (row: T) => string;
  isLoading?: boolean;
  empty: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode };
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  className?: string;
}) {
  const showPager = !!totalPages && totalPages > 1 && page != null && !!onPageChange;
  return (
    <div className={cn("sh-fade-in", className)}>
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c, i) => (
                <TableHead key={i} className={c.className}>
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <EmptyState
                    icon={empty.icon}
                    title={empty.title}
                    description={empty.description}
                    action={empty.action}
                    className="border-0"
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => <TableRow key={getRowKey(row)}>{renderRow(row)}</TableRow>)
            )}
          </TableBody>
        </Table>
      </div>
      {showPager && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page! <= 1}
              onClick={() => onPageChange!(page! - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page! >= totalPages!}
              onClick={() => onPageChange!(page! + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

> `renderRow` returns cells only when a row is **not** clickable. For row-click navigation (orders, products), pass a `renderRow` that returns the cells and attach the click via a wrapper: see Task 9 for the established pattern (the shell's `<TableRow>` wrapper takes the key; click handlers live on cells or via an `onRowClick` you can add if a page needs it). If multiple pages need row-click, extend the shell with an optional `onRowClick?: (row: T) => void` that adds `className="cursor-pointer"` + `onClick` to the `<TableRow>` — do this in Task 9 and reuse it.

- [ ] **Step 2: Add optional `onRowClick` to the shell** (needed by orders/products)

Update the props type to add `onRowClick?: (row: T) => void;` and change the populated-rows branch to:

```tsx
rows.map((row) => (
  <TableRow
    key={getRowKey(row)}
    className={onRowClick ? "cursor-pointer" : undefined}
    onClick={onRowClick ? () => onRowClick(row) : undefined}
  >
    {renderRow(row)}
  </TableRow>
));
```

- [ ] **Step 3: Type-check** — Run: `pnpm --filter @site-haus/commerce check-types` — Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/commerce/components/ui/data-table-shell.tsx
git commit -m ":sparkles: commerce — DataTableShell (table + skeleton + empty + pager)"
```

---

### Task 9: Convert the Orders page to the kit (reference implementation)

**Files:**

- Modify: `apps/commerce/app/[storeSlug]/(admin)/orders/page.tsx`
- Modify: `apps/commerce/app/[storeSlug]/(admin)/orders/_components/order-status-badge.tsx` (re-implement on `StatusBadge`)
- Modify: `apps/commerce/app/[storeSlug]/(admin)/orders/_components/order-filter-cards.tsx` (re-implement on `FilterCards`)

**Interfaces:**

- Consumes: `PageHeader`, `FilterCards`, `DataTableShell`, `StatusBadge`, `orderTone` from the kit.

- [ ] **Step 1: Re-point `OrderStatusBadge` onto `StatusBadge`**

```tsx
import type { OrderStatus } from "@/lib/commerce";
import { statusLabel } from "@/lib/order-display";
import { StatusBadge } from "@/components/ui/status-badge";
import { orderTone } from "@/components/ui/status-tone";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <StatusBadge tone={orderTone(status)} label={statusLabel(status)} />;
}
```

- [ ] **Step 2: Re-point `OrderFilterCards` onto `FilterCards`**

```tsx
"use client";

import { FilterCards, type FilterItem } from "@/components/ui/filter-cards";

export type OrderFilterKey =
  | "all"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "refunded"
  | "cancelled";

const ITEMS: FilterItem<OrderFilterKey>[] = [
  { key: "all", label: "All orders" },
  { key: "confirmed", label: "Needs action", tone: "active", alert: true },
  { key: "shipped", label: "Shipped", tone: "info" },
  { key: "delivered", label: "Delivered", tone: "success" },
  { key: "refunded", label: "Refunded", tone: "warning" },
  { key: "cancelled", label: "Cancelled", tone: "neutral" },
];

export function OrderFilterCards({
  active,
  onSelect,
  counts,
}: {
  active: OrderFilterKey;
  onSelect: (key: OrderFilterKey) => void;
  counts: Record<OrderFilterKey, number | undefined>;
}) {
  const items = ITEMS.map((it) => ({ ...it, count: counts[it.key] }));
  return <FilterCards items={items} active={active} onSelect={onSelect} />;
}
```

- [ ] **Step 3: Replace the Orders page header + table with kit primitives**

In `orders/page.tsx`: replace the hand-rolled header `<div>` (the block rendering the eyebrow/title/subtitle + `<RevenueSummary />`) with:

```tsx
<PageHeader
  title="Orders"
  subtitle={
    allCount.data === undefined ? "—" : `${allCount.data} order${allCount.data !== 1 ? "s" : ""}`
  }
  aside={<RevenueSummary />}
/>
```

Replace the `<div className="overflow-hidden rounded-xl border"><Table>…</Table></div>` block **and** the separate pagination `<div>` with a single `DataTableShell`:

```tsx
<DataTableShell
  columns={[
    { header: "Order" },
    { header: "Customer" },
    { header: "Status" },
    { header: "Items" },
    { header: "Total" },
    { header: "Date" },
    { header: "Action", className: "text-right" },
  ]}
  rows={data?.items ?? []}
  getRowKey={(o) => o.id}
  isLoading={isLoading}
  onRowClick={(o) => push(`/orders/${o.id}`)}
  empty={{ icon: ShoppingCart, title: "No orders found" }}
  page={currentPage}
  totalPages={totalPages}
  onPageChange={(p) => setOffset((p - 1) * LIMIT)}
  renderRow={(order) => (
    <>
      <TableCell className="font-numeric-id text-sm font-medium">
        #{order.id.slice(0, 8).toUpperCase()}
      </TableCell>
      <TableCell>
        <span className="flex items-center gap-2">
          <Avatar className="size-7">
            <AvatarFallback className="text-[11px]">
              {order.email.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-muted-foreground">{order.email}</span>
        </span>
      </TableCell>
      <TableCell>
        <OrderStatusBadge status={order.status} />
      </TableCell>
      <TableCell className="text-muted-foreground">{order.itemCount}</TableCell>
      <TableCell className="font-medium">{formatCents(order.totalCents, order.currency)}</TableCell>
      <TableCell className="text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        {/* keep the existing confirmed → Ship / Mark collected action block verbatim */}
      </TableCell>
    </>
  )}
/>
```

Keep the search `<form>`, the ship `<Dialog>`, and `<AbandonedDrawer>` exactly as they are. Move the inline action JSX (the `order.status === "confirmed" && …` block) into the last `<TableCell>` above unchanged. Remove now-dead imports (`Table*` if no longer used directly — they ARE still used inside `renderRow`'s `TableCell`, so keep `TableCell`; drop `Table, TableBody, TableHead, TableHeader, TableRow, Skeleton` if unused).

- [ ] **Step 4: Type-check, lint, build**

Run: `pnpm --filter @site-haus/commerce check-types && pnpm --filter @site-haus/commerce lint`
Expected: PASS. Then `pnpm --filter @site-haus/commerce build` — Expected: success.

- [ ] **Step 5: Visual QA (manual)** — Run `pnpm --filter @site-haus/commerce dev`, open the Orders page: header eyebrow+title, filter cards hover-lift, table rows, empty state (filter to an empty segment), loading skeleton, dark mode toggle. Confirm parity with the pre-change look.

- [ ] **Step 6: Commit**

```bash
git add apps/commerce/app/[storeSlug]/\(admin\)/orders
git commit -m ":recycle: commerce — Orders page on design kit (reference page)"
```

---

### Task 10: Phase 1 gate

- [ ] **Step 1: Full gate** — Run: `pnpm --filter @site-haus/commerce check-types && pnpm --filter @site-haus/commerce lint && pnpm --filter @site-haus/commerce build` — Expected: all green. Do not start Phase 2 until this passes.

---

## Phase 2 — List pages

Each task: thin the page header to `PageHeader`, swap the bespoke table/skeleton/empty/pager for `DataTableShell`, and swap any status pill for `StatusBadge`. Pattern is established in Task 9 — replicate it per page with the page-specific config below. Each task ends with check-types + lint + build + a commit.

### Task 11: Products page

**Files:** Modify `apps/commerce/app/[storeSlug]/(admin)/products/page.tsx`; re-implement `products/_components/status-badge.tsx` on `StatusBadge` + `productTone`.

- [ ] **Step 1:** Re-implement `status-badge.tsx`:

```tsx
import type { ProductStatus } from "@/lib/commerce";
import { StatusBadge } from "@/components/ui/status-badge";
import { productTone } from "@/components/ui/status-tone";

export function StatusBadge_Product({ status }: { status: ProductStatus }) {
  return (
    <StatusBadge tone={productTone(status)} label={status[0].toUpperCase() + status.slice(1)} />
  );
}
```

> Keep the existing exported name (`StatusBadge`) to avoid touching the import in `page.tsx`; the snippet renames only to avoid colliding with the kit import — alias on import in `page.tsx` instead if you keep the name: `import { StatusBadge as ProductStatusBadge }`. Pick one and be consistent.

- [ ] **Step 2:** Replace the `<PageHero …>` block with:

```tsx
<PageHeader
  title="Products"
  subtitle={isLoading ? "—" : `${total} product${total !== 1 ? "s" : ""}`}
  actions={
    <Button onClick={() => push("/products/new")}>
      <Plus className="size-4" />
      New Product
    </Button>
  }
/>
```

Keep the status `<Tabs>` as-is (this page filters via tabs, not FilterCards). Replace the table + pager with `DataTableShell` using columns `["", "Name", "Status", "Variants", "Created"]` (first column width `w-12` via `className`), `onRowClick={(p) => push(\`/products/${p.id}\`)}`, `empty={{ icon: Package, title: "No products yet", description: "Create your first product to get started." }}`, and a `renderRow`that returns the existing image / name /`StatusBadge` / variantCount / date cells.

- [ ] **Step 3:** check-types + lint + build green.
- [ ] **Step 4:** Commit `:recycle: commerce — Products page on design kit`.

### Task 12: Collections page (`collections/page.tsx`)

- [ ] PageHeader (`title="Collections"`, subtitle = count, `actions` = the existing New button). Convert its list/table to `DataTableShell` (or, if it is a card grid, keep the grid but wrap empty/loading in `EmptyState` + `Skeleton`). Status pills → `StatusBadge` (collections have a `scheduled`/active concept — map to `info`/`success`/`neutral` tones). check-types + lint + build. Commit `:recycle: commerce — Collections page on design kit`.

### Task 13: Inventory page (`inventory/page.tsx`)

- [ ] PageHeader (`title="Inventory"`, subtitle = count). Convert table → `DataTableShell`. Low-stock emphasis: render the qty cell with `text-primary font-medium` when at/below threshold (preserve existing logic). `empty={{ icon: <existing icon>, title: "No inventory tracked" }}`. check-types + lint + build. Commit `:recycle: commerce — Inventory page on design kit`.

### Task 14: Shipping page (`shipping/page.tsx`)

- [ ] PageHeader (`title="Shipping"`, subtitle describes zones/rates, `actions` = New Zone). The page is zone cards (`zone-card.tsx`) — keep cards but standardize: wrap each zone in `SectionCard`, use `EmptyState` for the no-zones case, `StatusBadge` for any rate flags. check-types + lint + build. Commit `:recycle: commerce — Shipping page on design kit`.

### Task 15: Webhooks page (`webhooks/page.tsx`)

- [ ] PageHeader (`title="Webhooks"`, `actions` = Add Endpoint). Endpoint list → `DataTableShell` or `SectionCard` per endpoint (match current structure). Delivery-log statuses → `StatusBadge` (`success`/`danger`/`warning`). check-types + lint + build. Commit `:recycle: commerce — Webhooks page on design kit`.

### Task 16: Analytics page (`analytics/page.tsx`)

- [ ] PageHeader (`title="Analytics"`, subtitle = date range). Wrap each chart (`revenue-chart`, `top-products-chart`) in `SectionCard`; convert `top-products-table.tsx` to `DataTableShell`. check-types + lint + build. Commit `:recycle: commerce — Analytics page on design kit`.

### Task 17: Dashboard (`(admin)/page.tsx` → `_components/dashboard-view.tsx`)

- [ ] Add a `PageHeader` (`title="Dashboard"`, subtitle = store name or greeting) at the top of `dashboard-view.tsx`. Keep the `stat-cards`/`revenue-chart`/`top-products-chart` but wrap chart/list blocks (`recent-orders`, `low-stock-alerts`) in `SectionCard`. `recent-orders` statuses → `StatusBadge`. check-types + lint + build. Commit `:recycle: commerce — Dashboard on design kit`.

### Task 18: Phase 2 gate

- [ ] Full gate (check-types + lint + build) green across the package. Manual visual sweep of all 7 pages (header, empty, loading, hover, dark mode). Do not start Phase 3 until green.

---

## Phase 3 — Detail / form pages

### Task 19: Product detail (`products/[id]/page.tsx` + `_components/*`)

- [ ] Replace the detail header with `PageHeader` (title = product name, `back` affordance via `actions` containing a back `Button variant="ghost"` linking to `/products`). Wrap `Details`, `Variants`, `Status`, `Images`, `Inventory` cards in `SectionCard` (they already use `Card` — migrate to `SectionCard` titles for consistency). Status pills → `StatusBadge`. Keep the existing two-column `grid grid-cols-1 lg:grid-cols-3` layout. check-types + lint + build. Commit `:recycle: commerce — Product detail on design kit`.

### Task 20: Order detail (`orders/[id]/page.tsx`)

- [ ] `PageHeader` (title = `#<short id>` in `.font-numeric-id`, subtitle = date/customer, `aside` = order status `StatusBadge`, `actions` = back). Wrap summary/customer/fulfilment/items blocks in `SectionCard`. check-types + lint + build. Commit `:recycle: commerce — Order detail on design kit`.

### Task 21: Collection detail (`collections/[id]/page.tsx`)

- [ ] `PageHeader` (title = collection name, back). Wrap form/products blocks in `SectionCard`. Scheduled/active state → `StatusBadge`. check-types + lint + build. Commit `:recycle: commerce — Collection detail on design kit`.

### Task 22: Settings (`settings/page.tsx`)

- [ ] `PageHeader` (`title="Settings"`, subtitle = store name). Convert each settings group (store info, fulfilment type, notifications, reservation TTL) into a `SectionCard` with a footer Save action. Keep the existing form state/mutations. Fulfilment `pickup` warning callout stays. check-types + lint + build. Commit `:recycle: commerce — Settings on design kit`.

### Task 23: Phase 3 gate

- [ ] Full gate green. Manual visual sweep of the 4 detail/form pages. Do not start Phase 4 until green.

---

## Phase 4 — Dialogs + app shell

### Task 24: Dialog standardization

**Files:** the dialogs across `_components/` (`adjust-inventory-dialog`, `variant-dialog`, `option-dialog`, `rate-dialog`, `zone-dialog`, `endpoint-dialog`, `secret-dialog`, the inline ship dialog in `orders/page.tsx`).

- [ ] For each: confirm `DialogContent` width is intentional (`sm:max-w-sm`/`md` consistent by content), `DialogTitle` uses default (not `font-display` — dialogs read better in body), footer button order is `[Cancel (outline)] [Confirm (primary)]`, and destructive confirms use `Button variant="destructive"`. Add `className="sh-fade-in"` only if a dialog lacks shadcn's built-in animation (most won't need it). This is a light consistency pass — no structural rewrites. check-types + lint + build. Commit `:lipstick: commerce — dialog consistency pass`.

### Task 25: App shell polish (`(admin)/layout.tsx` + `components/sidebar/app-sidebar.tsx`)

- [ ] Topbar: keep the sticky header; optionally show the store name next to `SidebarTrigger` (read from the `["store"]` query) in `font-display text-sm`. Sidebar: ensure the active nav item uses terracotta (`data-active` → `bg-primary/5 text-primary` via the existing sidebar tokens — verify `--sidebar-primary` is wired). Add the brand mark + store name to the sidebar header to match the mockup. Restrained — no layout restructure. check-types + lint + build. Commit `:lipstick: commerce — app shell warm-editorial polish`.

### Task 26: Final gate + cleanup

- [ ] Full gate green. Delete `apps/commerce/components/page-hero.tsx` if no longer imported anywhere (`grep -rn "components/page-hero" apps/commerce`); if still referenced, convert those references to `PageHeader` first. Confirm no remaining imports of the local `PageHero`. Final manual sweep across all surfaces in light + dark. Commit `:fire: commerce — remove superseded local PageHero wrapper` (only if deleted).

---

## Self-Review notes

- **Spec coverage:** kit primitives (Tasks 2–8) ↔ spec "design kit" table; tokens (Task 1) ↔ "Visual tokens"; scaffold/per-surface ↔ Phases 2–3; dialogs+shell ↔ Phase 4; verification gates ↔ spec "Verification". Reuse-first honored (every primitive composes `base/*`; no `packages/ui` edits). The TanStack-pagination non-reuse is corrected vs. the spec's optimistic note — documented in Global Constraints + Task 8.
- **Phase 2/3/4 granularity:** these are pattern-rollout tasks over an established reference (Task 9). Each names exact files + page-specific config (columns, filter items, tones, empty copy) rather than reproducing full JSX, per "follow established patterns in existing codebases." Implementers copy the Task 9 pattern.
- **Open verify points flagged inline:** exact `ProductStatus`/collection-status unions (Task 2/12/21) and `Card*` sub-export names (Task 6) to confirm against source while implementing.
