# Commerce Orders Redesign + Abandoned-Checkout Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop counting/showing unpaid Stripe payment-intents (`pending`) as orders, redesign the commerce Orders page to the SiteHaus brand with stat-card filters + inline fulfilment actions, and auto-expire stale `pending` orders via the worker.

**Architecture:** Two repos. Frontend (`apps/commerce` + `packages/ui`) in `~/Dev/sitehaus` excludes `pending` from all order surfaces and re-skins with existing warm brand tokens + shadcn primitives. Worker (`apps/worker`) in `~/Dev/sitehaus-commerce` adds a daily `order.expire` job that transitions `pending` → `cancelled` after 72h. The backend list API already supports multi-status filtering, so no contract change is needed.

**Tech Stack:** Next.js 16 / React 19, Tailwind 4 + shadcn/ui (`@site-haus/ui`), TanStack Query, recharts 2.15.4; NestJS + BullMQ + Drizzle (worker); jest (worker only).

## Global Constraints

- **Branch:** all work lands on `release/commerce-flagship` (both repos are already on it).
- **Commits:** gitmoji style (e.g. `:sparkles:`, `:lipstick:`, `:recycle:`); **no `Co-Authored-By` trailer**.
- **No test runner in `apps/commerce` or `packages/ui`** — frontend tasks are gated by `pnpm check-types` + `pnpm build --filter=commerce` + manual visual check, not unit tests. The **worker** task uses real jest TDD.
- **`pending` is never an order.** Real statuses = `confirmed, shipped, delivered, refunded, cancelled`.
- **Brand tokens only** — use semantic Tailwind classes (`bg-card`, `text-muted-foreground`, `border`, `primary`) and chart vars (`--chart-1..5`); no hardcoded slate/amber/indigo hex.
- **Stale-pending threshold:** 72h. Action: status → `cancelled` (soft; keeps row). No Stripe PaymentIntent cancellation in this pass.

---

## Task 1: Worker — `order.expire` job (repo: `~/Dev/sitehaus-commerce`)

**Files:**

- Create: `apps/worker/src/processors/order-expire.processor.ts`
- Create: `apps/worker/src/processors/order-expire.processor.spec.ts`
- Modify: `apps/worker/src/app.module.ts` (register processor)
- Modify: `apps/worker/src/main.ts` (register repeatable job)

**Interfaces:**

- Produces: `OrderExpireProcessor` with `process(job): Promise<void>` that runs only for `job.name === "order.expire"`; calls `db.execute(...)` and logs `Cancelled N abandoned orders` when `rowCount > 0`.

- [ ] **Step 1: Write the failing test** — mirror `cart-expire.processor.spec.ts`.

Create `apps/worker/src/processors/order-expire.processor.spec.ts`:

```ts
import { Test, TestingModule } from "@nestjs/testing";
import { DB_TOKEN } from "@sitehaus-ecom/shared";
import { OrderExpireProcessor } from "./order-expire.processor";

describe("OrderExpireProcessor", () => {
  let processor: OrderExpireProcessor;
  let db: { execute: jest.Mock };
  let logSpy: jest.SpyInstance;

  beforeEach(async () => {
    db = { execute: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderExpireProcessor, { provide: DB_TOKEN, useValue: db }],
    }).compile();
    processor = module.get(OrderExpireProcessor);
    logSpy = jest.spyOn((processor as any).logger, "log").mockImplementation(() => {});
  });

  afterEach(() => jest.clearAllMocks());

  it("ignores jobs that are not order.expire", async () => {
    await processor.process({ name: "cart.expire", data: {} } as any);
    expect(db.execute).not.toHaveBeenCalled();
  });

  it("calls db.execute when job is order.expire", async () => {
    db.execute.mockResolvedValue({ rowCount: 0 });
    await processor.process({ name: "order.expire", data: {} } as any);
    expect(db.execute).toHaveBeenCalledTimes(1);
  });

  it("logs when abandoned orders are cancelled", async () => {
    db.execute.mockResolvedValue({ rowCount: 3 });
    await processor.process({ name: "order.expire", data: {} } as any);
    expect(logSpy).toHaveBeenCalledWith("Cancelled 3 abandoned orders");
  });

  it("does not log when nothing is cancelled", async () => {
    db.execute.mockResolvedValue({ rowCount: 0 });
    await processor.process({ name: "order.expire", data: {} } as any);
    expect(logSpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `cd ~/Dev/sitehaus-commerce/apps/worker && pnpm test order-expire`
Expected: FAIL — `Cannot find module './order-expire.processor'`.

- [ ] **Step 3: Implement the processor** — mirror `cart-expire.processor.ts`.

Create `apps/worker/src/processors/order-expire.processor.ts`:

```ts
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { DB_TOKEN } from "@sitehaus-ecom/shared";
import { Db, sql } from "@sitehaus-ecom/database";

@Processor("ecom-orders")
export class OrderExpireProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderExpireProcessor.name);

  constructor(@Inject(DB_TOKEN) private readonly db: Db) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== "order.expire") return;
    const cancelled = await this.cancelStale();
    if (cancelled > 0) this.logger.log(`Cancelled ${cancelled} abandoned orders`);
  }

  private async cancelStale(): Promise<number> {
    const result = await this.db.execute(sql`
      UPDATE orders
      SET status = 'cancelled', updated_at = now()
      WHERE id IN (
        SELECT id FROM orders
        WHERE status = 'pending'
          AND created_at < now() - interval '72 hours'
        LIMIT 200
      )
    `);
    return result.rowCount ?? 0;
  }
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `cd ~/Dev/sitehaus-commerce/apps/worker && pnpm test order-expire`
Expected: PASS (4 tests).

- [ ] **Step 5: Register the processor** in `apps/worker/src/app.module.ts`.

Import it next to `CartExpireProcessor` and add `OrderExpireProcessor` to the module `providers` array (same place `CartExpireProcessor` is listed).

- [ ] **Step 6: Register the repeatable job** in `apps/worker/src/main.ts`.

After the existing `ordersQueue.add("cart.expire", …)` block, add:

```ts
await ordersQueue.add(
  "order.expire",
  {},
  {
    repeat: { pattern: "15 3 * * *" }, // daily 3:15am UTC (offset from cart.expire 3:00)
    removeOnComplete: 5,
    removeOnFail: 10,
  },
);
```

- [ ] **Step 7: Verify build + full worker tests**

Run: `cd ~/Dev/sitehaus-commerce/apps/worker && pnpm test && pnpm build`
Expected: all tests PASS, build succeeds.

- [ ] **Step 8: Commit** (in `~/Dev/sitehaus-commerce`)

```bash
cd ~/Dev/sitehaus-commerce
git add apps/worker/src/processors/order-expire.processor.ts \
        apps/worker/src/processors/order-expire.processor.spec.ts \
        apps/worker/src/app.module.ts apps/worker/src/main.ts
git commit -m ":sparkles: worker — order.expire cancels stale pending orders after 72h"
```

---

## Task 2: Frontend — order-display + format helpers (repo: `~/Dev/sitehaus`)

**Files:**

- Create: `apps/commerce/lib/order-display.ts`
- Create: `apps/commerce/lib/format.ts`

**Interfaces:**

- Produces:
  - `REAL_ORDER_STATUSES: OrderStatus[]`
  - `statusLabel(s: OrderStatus): string`
  - `statusDotColor(s: OrderStatus): string` (a CSS color value)
  - `formatCents(cents: number, currency: string): string`
  - `formatDate(iso: string): string`

- [ ] **Step 1: Create `apps/commerce/lib/format.ts`**

```ts
export function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
```

- [ ] **Step 2: Create `apps/commerce/lib/order-display.ts`**

```ts
import type { OrderStatus } from "./commerce";

/** Statuses that count as real orders. `pending` (abandoned checkout) and `failed` are excluded. */
export const REAL_ORDER_STATUSES: OrderStatus[] = [
  "confirmed",
  "shipped",
  "delivered",
  "refunded",
  "cancelled",
];

const LABELS: Record<OrderStatus, string> = {
  pending: "Abandoned",
  confirmed: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  failed: "Payment failed",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

export function statusLabel(s: OrderStatus): string {
  return LABELS[s];
}

/** Theme-safe colored dot per status (neutral text + colored dot reads on light & dark). */
const DOT: Record<OrderStatus, string> = {
  pending: "var(--muted-foreground)",
  confirmed: "var(--chart-5)", // warm gold
  shipped: "var(--chart-4)", // rose
  delivered: "var(--chart-2)", // sage
  failed: "var(--destructive)",
  refunded: "var(--chart-3)", // clay
  cancelled: "var(--muted-foreground)",
};

export function statusDotColor(s: OrderStatus): string {
  return DOT[s];
}
```

- [ ] **Step 3: Typecheck**

Run: `cd /home/pillar/Dev/sitehaus && pnpm check-types`
Expected: PASS (no errors introduced).

- [ ] **Step 4: Commit**

```bash
cd /home/pillar/Dev/sitehaus
git add apps/commerce/lib/order-display.ts apps/commerce/lib/format.ts
git commit -m ":recycle: commerce — order-display + format helpers (real-status set, status tones)"
```

---

## Task 3: Shared `StatCard` primitive (repo: `~/Dev/sitehaus`)

**Files:**

- Create: `packages/ui/src/components/base/stat-card.tsx`

The UI package exports `./components/*` via a wildcard (`packages/ui/package.json`), so the new file is importable as `@site-haus/ui/components/base/stat-card` with no export edits.

**Interfaces:**

- Produces: `StatCard` and `StatCardProps { label: string; value: React.ReactNode; dotColor?: string; active?: boolean; alert?: boolean; onClick?: () => void; className?: string }`.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import * as React from "react";
import { cn } from "@site-haus/ui/lib/utils";

export type StatCardProps = {
  label: string;
  value: React.ReactNode;
  dotColor?: string;
  active?: boolean;
  alert?: boolean;
  onClick?: () => void;
  className?: string;
};

export function StatCard({
  label,
  value,
  dotColor,
  active,
  alert,
  onClick,
  className,
}: StatCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active ? "" : undefined}
      className={cn(
        "flex flex-1 flex-col items-start rounded-xl border bg-card px-4 py-3 text-left ring-1 ring-foreground/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        !active && "border-border/60",
        active && "border-primary/70 bg-primary/5 ring-primary/30",
        alert && "border-primary/40",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase",
          alert && "text-primary",
        )}
      >
        {dotColor && (
          <span className="size-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
        )}
        {label}
      </span>
      <span
        className="mt-1.5 text-2xl font-medium tabular-nums text-foreground"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </span>
    </button>
  );
}
```

- [ ] **Step 2: Typecheck + build**

Run: `cd /home/pillar/Dev/sitehaus && pnpm check-types`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
cd /home/pillar/Dev/sitehaus
git add packages/ui/src/components/base/stat-card.tsx
git commit -m ":sparkles: ui — StatCard primitive (warm card, active terracotta, Fraunces value)"
```

---

## Task 4: `listOrders` multi-status support (repo: `~/Dev/sitehaus`)

**Files:**

- Modify: `apps/commerce/lib/commerce.ts` (the `listOrders` function near the `// ─── Orders ───` section)

**Interfaces:**

- Produces: `listOrders({ status?: OrderStatus | OrderStatus[]; email?; limit?; offset?; sort? })`. Backward compatible — a single status still works; arrays serialize as repeated `status=` params, which the backend `adminListOrdersQuerySchema` already accepts (`union([enum, array(enum)])` + `inArray`).

- [ ] **Step 1: Replace the `listOrders` definition**

```ts
export const listOrders = (params?: {
  status?: OrderStatus | OrderStatus[];
  email?: string;
  limit?: number;
  offset?: number;
  sort?: "newest" | "oldest";
}) => {
  const qs = new URLSearchParams();
  if (params?.status) {
    const statuses = Array.isArray(params.status) ? params.status : [params.status];
    statuses.forEach((s) => qs.append("status", s));
  }
  if (params?.email) qs.set("email", params.email);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  if (params?.sort) qs.set("sort", params.sort);
  return request<OrderListResponse>(`/v1/admin/orders?${qs}`);
};
```

- [ ] **Step 2: Typecheck**

Run: `cd /home/pillar/Dev/sitehaus && pnpm check-types`
Expected: PASS.

- [ ] **Step 3: Manual API check** — with the commerce dev stack running, confirm the array filter works:

Run (browser devtools or curl with a valid token):
`GET /v1/admin/orders?status=confirmed&status=shipped&limit=5`
Expected: only `confirmed`/`shipped` rows returned, `total` reflects the union. If the gateway returns a 400 on repeated keys, fall back to a single combined call per card (status arrays still validated server-side per `orders-handler.service.ts:174`).

- [ ] **Step 4: Commit**

```bash
cd /home/pillar/Dev/sitehaus
git add apps/commerce/lib/commerce.ts
git commit -m ":recycle: commerce — listOrders accepts a status array (repeated query params)"
```

---

## Task 5: Restyle `OrderStatusBadge` (repo: `~/Dev/sitehaus`)

**Files:**

- Modify: `apps/commerce/app/[storeSlug]/(admin)/orders/_components/order-status-badge.tsx`

**Interfaces:**

- Consumes: `statusLabel`, `statusDotColor` from `@/lib/order-display` (Task 2).
- Produces: unchanged export `OrderStatusBadge({ status })`.

- [ ] **Step 1: Replace the file contents**

```tsx
import { Badge } from "@site-haus/ui/components/base/badge";
import type { OrderStatus } from "@/lib/commerce";
import { statusDotColor, statusLabel } from "@/lib/order-display";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant="outline" className="gap-1.5 font-medium">
      <span className="size-1.5 rounded-full" style={{ backgroundColor: statusDotColor(status) }} />
      {statusLabel(status)}
    </Badge>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /home/pillar/Dev/sitehaus && pnpm check-types`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
cd /home/pillar/Dev/sitehaus
git add "apps/commerce/app/[storeSlug]/(admin)/orders/_components/order-status-badge.tsx"
git commit -m ":lipstick: commerce — OrderStatusBadge uses brand dot + label helpers"
```

---

## Task 6: Brand fonts in commerce admin (repo: `~/Dev/sitehaus`)

**Files:**

- Modify: `apps/commerce/app/layout.tsx`
- Modify: `apps/commerce/app/globals.css`

**Interfaces:**

- Produces: CSS vars `--font-display` (Fraunces), `--font-body` (Inter Tight), `--font-mono` (JetBrains Mono) on `<body>`, plus utility classes `.font-display` and `.font-numeric-id`.

- [ ] **Step 1: Add fonts to `apps/commerce/app/layout.tsx`**

Replace the file with:

```tsx
import type { Metadata } from "next";
import { Fraunces, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import Providers from "./providers/providers";
import "./globals.css";

const displayFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

const bodyFont = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "SiteHaus - Commerce Admin",
  description: "SiteHaus Commerce Admin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Add the font utilities to `apps/commerce/app/globals.css`**

Append at the end of the file (after the existing token blocks):

```css
/* ── Brand fonts ────────────────────────────────────────────────── */
body {
  font-family:
    var(--font-body),
    -apple-system,
    "Helvetica Neue",
    sans-serif;
}
.font-display {
  font-family: var(--font-display), Georgia, serif;
}
.font-numeric-id {
  font-family: var(--font-mono), ui-monospace, monospace;
}
```

- [ ] **Step 3: Build to confirm fonts resolve**

Run: `cd /home/pillar/Dev/sitehaus && pnpm build --filter=commerce`
Expected: build succeeds (Google fonts fetched at build).

- [ ] **Step 4: Commit**

```bash
cd /home/pillar/Dev/sitehaus
git add apps/commerce/app/layout.tsx apps/commerce/app/globals.css
git commit -m ":lipstick: commerce — load Fraunces / Inter Tight / JetBrains Mono brand fonts"
```

---

## Task 7: `OrderFilterCards` component (repo: `~/Dev/sitehaus`)

**Files:**

- Create: `apps/commerce/app/[storeSlug]/(admin)/orders/_components/order-filter-cards.tsx`

**Interfaces:**

- Consumes: `StatCard` from `@site-haus/ui/components/base/stat-card` (Task 3).
- Produces:
  - type `OrderFilterKey = "all" | "confirmed" | "shipped" | "delivered" | "refunded" | "cancelled"`
  - `OrderFilterCards({ active, onSelect, counts })` where `counts: Record<OrderFilterKey, number | undefined>`.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { StatCard } from "@site-haus/ui/components/base/stat-card";

export type OrderFilterKey =
  | "all"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "refunded"
  | "cancelled";

const CARDS: { key: OrderFilterKey; label: string; dot?: string; alert?: boolean }[] = [
  { key: "all", label: "All orders" },
  { key: "confirmed", label: "Needs action", dot: "var(--chart-1)", alert: true },
  { key: "shipped", label: "Shipped", dot: "var(--chart-4)" },
  { key: "delivered", label: "Delivered", dot: "var(--chart-2)" },
  { key: "refunded", label: "Refunded", dot: "var(--chart-3)" },
  { key: "cancelled", label: "Cancelled", dot: "var(--muted-foreground)" },
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
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
      {CARDS.map((c) => (
        <StatCard
          key={c.key}
          label={c.label}
          value={counts[c.key] ?? "—"}
          dotColor={c.dot}
          alert={c.alert}
          active={active === c.key}
          onClick={() => onSelect(c.key)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /home/pillar/Dev/sitehaus && pnpm check-types`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
cd /home/pillar/Dev/sitehaus
git add "apps/commerce/app/[storeSlug]/(admin)/orders/_components/order-filter-cards.tsx"
git commit -m ":sparkles: commerce — OrderFilterCards (stat-card filter row)"
```

---

## Task 8: `AbandonedDrawer` component (repo: `~/Dev/sitehaus`)

**Files:**

- Create: `apps/commerce/app/[storeSlug]/(admin)/orders/_components/abandoned-drawer.tsx`

**Interfaces:**

- Consumes: `formatCents`, `formatDate` from `@/lib/format` (Task 2); `AdminOrderSummary` from `@/lib/commerce`.
- Produces: `AbandonedDrawer({ items, total, onOpenOrder })`.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@site-haus/ui/components/base/table";
import type { AdminOrderSummary } from "@/lib/commerce";
import { formatCents, formatDate } from "@/lib/format";

export function AbandonedDrawer({
  items,
  total,
  onOpenOrder,
}: {
  items: AdminOrderSummary[];
  total: number;
  onOpenOrder: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (total === 0) return null;

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-dashed border-border/70 bg-card/40">
      <button
        className="flex w-full items-center gap-2 px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        <span className="font-medium">Abandoned checkouts</span>
        <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{total}</span>
        <span className="ml-auto hidden text-xs sm:inline">
          never paid · auto-cleaned, not counted
        </span>
      </button>
      {open && (
        <div className="border-t border-border/60 opacity-70">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((o) => (
                <TableRow key={o.id} className="cursor-pointer" onClick={() => onOpenOrder(o.id)}>
                  <TableCell className="font-numeric-id text-sm font-medium">
                    #{o.id.slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell>{o.email}</TableCell>
                  <TableCell>{o.itemCount}</TableCell>
                  <TableCell>{formatCents(o.totalCents, o.currency)}</TableCell>
                  <TableCell>{formatDate(o.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {total > 50 && (
            <p className="py-2 text-center text-xs text-muted-foreground">Showing 50 of {total}</p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /home/pillar/Dev/sitehaus && pnpm check-types`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
cd /home/pillar/Dev/sitehaus
git add "apps/commerce/app/[storeSlug]/(admin)/orders/_components/abandoned-drawer.tsx"
git commit -m ":sparkles: commerce — AbandonedDrawer (collapsed, de-emphasised, never counted)"
```

---

## Task 9: Rewrite the Orders page (repo: `~/Dev/sitehaus`)

**Files:**

- Modify (full rewrite): `apps/commerce/app/[storeSlug]/(admin)/orders/page.tsx`

**Interfaces:**

- Consumes: `OrderFilterCards`/`OrderFilterKey` (Task 7), `AbandonedDrawer` (Task 8), `OrderStatusBadge` (Task 5), `REAL_ORDER_STATUSES` (Task 2), `formatCents`/`formatDate` (Task 2), `listOrders` array support (Task 4), `StatCard`/Avatar/Dialog from `@site-haus/ui`.

- [ ] **Step 1: Replace the whole file**

```tsx
"use client";

import {
  collectOrder,
  getMyStore,
  listOrders,
  shipOrder,
  type AdminOrderSummary,
  type OrderStatus,
} from "@/lib/commerce";
import { REAL_ORDER_STATUSES } from "@/lib/order-display";
import { formatCents, formatDate } from "@/lib/format";
import { useStoreNav } from "@/lib/use-store-nav";
import { Avatar, AvatarFallback } from "@site-haus/ui/components/base/avatar";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@site-haus/ui/components/base/dialog";
import { Input } from "@site-haus/ui/components/base/input";
import { Label } from "@site-haus/ui/components/base/label";
import { Skeleton } from "@site-haus/ui/components/base/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@site-haus/ui/components/base/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShoppingCart, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { OrderStatusBadge } from "./_components/order-status-badge";
import { OrderFilterCards, type OrderFilterKey } from "./_components/order-filter-cards";
import { AbandonedDrawer } from "./_components/abandoned-drawer";

const LIMIT = 20;

const FILTER_STATUSES: Record<OrderFilterKey, OrderStatus[]> = {
  all: REAL_ORDER_STATUSES,
  confirmed: ["confirmed"],
  shipped: ["shipped"],
  delivered: ["delivered"],
  refunded: ["refunded"],
  cancelled: ["cancelled"],
};

function useOrderCount(key: OrderFilterKey) {
  return useQuery({
    queryKey: ["orders", "count", key],
    queryFn: () => listOrders({ status: FILTER_STATUSES[key], limit: 1 }).then((r) => r.total),
  });
}

export default function OrdersPage() {
  const { push } = useStoreNav();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<OrderFilterKey>("all");
  const [email, setEmail] = useState("");
  const [emailSearch, setEmailSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [shipOrderId, setShipOrderId] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");

  const { data: store } = useQuery({ queryKey: ["store"], queryFn: getMyStore });
  const fulfillmentType = store?.fulfillmentType ?? "shipping";

  // ── card counts (total only) ──
  const allCount = useOrderCount("all");
  const confirmedCount = useOrderCount("confirmed");
  const shippedCount = useOrderCount("shipped");
  const deliveredCount = useOrderCount("delivered");
  const refundedCount = useOrderCount("refunded");
  const cancelledCount = useOrderCount("cancelled");

  const counts: Record<OrderFilterKey, number | undefined> = {
    all: allCount.data,
    confirmed: confirmedCount.data,
    shipped: shippedCount.data,
    delivered: deliveredCount.data,
    refunded: refundedCount.data,
    cancelled: cancelledCount.data,
  };

  // ── abandoned (pending) ──
  const { data: pendingData } = useQuery({
    queryKey: ["orders", "pending"],
    queryFn: () => listOrders({ status: ["pending"], limit: 50, sort: "newest" }),
  });

  // ── main list ──
  const { data, isLoading } = useQuery({
    queryKey: ["orders", "list", filter, emailSearch, offset],
    queryFn: () =>
      listOrders({
        status: FILTER_STATUSES[filter],
        email: emailSearch || undefined,
        limit: LIMIT,
        offset,
        sort: "newest",
      }),
  });

  const shipMutation = useMutation({
    mutationFn: () => shipOrder(shipOrderId!, trackingNumber),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order marked as shipped");
      setShipOrderId(null);
      setTrackingNumber("");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to ship order"),
  });

  const collectMutation = useMutation({
    mutationFn: (orderId: string) => collectOrder(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order marked as collected");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to collect order"),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  function handleSelect(key: OrderFilterKey) {
    setFilter(key);
    setOffset(0);
  }

  function handleEmailSearch(e: React.FormEvent) {
    e.preventDefault();
    setEmailSearch(email);
    setOffset(0);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
            Store
          </p>
          <h1 className="font-display mt-0.5 text-3xl font-medium tracking-tight">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {allCount.data === undefined
              ? "—"
              : `${allCount.data} order${allCount.data !== 1 ? "s" : ""}`}
          </p>
        </div>
        {/* Revenue block added in Task 11 */}
      </div>

      <OrderFilterCards active={filter} onSelect={handleSelect} counts={counts} />

      <form onSubmit={handleEmailSearch} className="mt-6 mb-4 flex gap-2">
        <Input
          placeholder="Search by email..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-56"
        />
        <Button type="submit" variant="outline" size="sm">
          Search
        </Button>
        {emailSearch && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setEmail("");
              setEmailSearch("");
              setOffset(0);
            }}
          >
            Clear
          </Button>
        )}
      </form>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <ShoppingCart className="mb-3 size-10 opacity-30" />
                    <p className="font-medium">No orders found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((order: AdminOrderSummary) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer"
                  onClick={() => push(`/orders/${order.id}`)}
                >
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
                  <TableCell className="font-medium">
                    {formatCents(order.totalCents, order.currency)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {order.status === "confirmed" &&
                      (fulfillmentType === "pickup" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => collectMutation.mutate(order.id)}
                          disabled={collectMutation.isPending}
                        >
                          {collectMutation.isPending && (
                            <Loader2 className="size-3.5 animate-spin" />
                          )}
                          Mark collected
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setShipOrderId(order.id);
                            setTrackingNumber("");
                          }}
                        >
                          <Truck className="size-3.5" />
                          Ship
                        </Button>
                      ))}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + LIMIT >= total}
              onClick={() => setOffset((o) => o + LIMIT)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AbandonedDrawer
        items={pendingData?.items ?? []}
        total={pendingData?.total ?? 0}
        onOpenOrder={(id) => push(`/orders/${id}`)}
      />

      <Dialog
        open={!!shipOrderId}
        onOpenChange={(o) => {
          if (!o) {
            setShipOrderId(null);
            setTrackingNumber("");
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark as Shipped</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Tracking Number</Label>
            <Input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. 1Z999AA10123456784"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && trackingNumber.trim()) shipMutation.mutate();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShipOrderId(null);
                setTrackingNumber("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => shipMutation.mutate()}
              disabled={shipMutation.isPending || !trackingNumber.trim()}
            >
              {shipMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Confirm & notify buyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + build**

Run: `cd /home/pillar/Dev/sitehaus && pnpm check-types && pnpm build --filter=commerce`
Expected: PASS.

- [ ] **Step 3: Visual verification** — run the commerce dev stack, open `/{storeSlug}/orders`. Confirm: hero count = real orders only (no `pending`); filter cards filter the table; only `confirmed` rows show Ship/Mark-collected (per `fulfillmentType`); the ship dialog still works; abandoned checkouts appear only in the collapsed drawer; brand styling (parchment, Fraunces title, mono IDs, status dots).

- [ ] **Step 4: Commit**

```bash
cd /home/pillar/Dev/sitehaus
git add "apps/commerce/app/[storeSlug]/(admin)/orders/page.tsx"
git commit -m ":lipstick: commerce — redesign Orders page (filter cards, inline actions, abandoned drawer, brand)"
```

---

## Task 10: Exclude pending from dashboard `recent-orders` (repo: `~/Dev/sitehaus`)

**Files:**

- Modify: `apps/commerce/app/[storeSlug]/(admin)/_components/recent-orders.tsx`

**Interfaces:**

- Consumes: `REAL_ORDER_STATUSES` (Task 2), `formatCents`/`formatDate` (Task 2).

- [ ] **Step 1: Update the query + imports**

Replace the two local format helpers and the `listOrders` call. Change the imports block to add:

```tsx
import { REAL_ORDER_STATUSES } from "@/lib/order-display";
import { formatCents, formatDate } from "@/lib/format";
```

Delete the local `formatCents` and `formatDate` function definitions in the file.

Change the query to exclude pending:

```tsx
const { data, isLoading } = useQuery({
  queryKey: ["orders-recent"],
  queryFn: () => listOrders({ status: REAL_ORDER_STATUSES, limit: 8, sort: "newest" }),
});
```

(`formatDate` here used a shorter format; switching to the shared helper changes it to include the year — acceptable and consistent with the rest of the redesign.)

- [ ] **Step 2: Typecheck**

Run: `cd /home/pillar/Dev/sitehaus && pnpm check-types`
Expected: PASS.

- [ ] **Step 3: Visual check** — dashboard home "Recent Orders" no longer lists "Awaiting Payment" rows.

- [ ] **Step 4: Commit**

```bash
cd /home/pillar/Dev/sitehaus
git add "apps/commerce/app/[storeSlug]/(admin)/_components/recent-orders.tsx"
git commit -m ":recycle: commerce — Recent Orders excludes abandoned (pending) checkouts"
```

---

## Task 11: Revenue summary block (repo: `~/Dev/sitehaus`) — polish

**Files:**

- Create: `apps/commerce/app/[storeSlug]/(admin)/orders/_components/revenue-summary.tsx`
- Modify: `apps/commerce/app/[storeSlug]/(admin)/orders/page.tsx` (mount in the header)

**Interfaces:**

- Consumes: `getAnalyticsRevenue` from `@/lib/commerce`, shadcn `ChartContainer` from `@site-haus/ui/components/base/chart`, `recharts`.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { getAnalyticsRevenue } from "@/lib/commerce";
import { ChartContainer, type ChartConfig } from "@site-haus/ui/components/base/chart";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart } from "recharts";

const config = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
} satisfies ChartConfig;

function monthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to), label: now.toLocaleString("en-US", { month: "long" }) };
}

export function RevenueSummary() {
  const { from, to, label } = monthRange();
  const { data } = useQuery({
    queryKey: ["analytics", "revenue", from, to],
    queryFn: () => getAnalyticsRevenue(from, to, "day"),
  });

  const periods = data?.periods ?? [];
  // NOTE: verify the unit of `revenue` against a known order. If it is already
  // in dollars (not cents), drop the `/ 100` below.
  const totalCents = periods.reduce((sum, p) => sum + p.revenue, 0);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(totalCents / 100);

  return (
    <div className="text-right">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
        Revenue · {label}
      </p>
      <div className="mt-1 flex items-end justify-end gap-3">
        {periods.length > 1 && (
          <ChartContainer config={config} className="h-7 w-24">
            <AreaChart data={periods}>
              <Area
                dataKey="revenue"
                type="monotone"
                stroke="var(--chart-1)"
                fill="var(--chart-1)"
                fillOpacity={0.15}
                strokeWidth={2}
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        )}
        <span className="font-display text-3xl font-medium tracking-tight tabular-nums">
          {formatted}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Mount it in the page header** — in `page.tsx`, replace the comment line `{/* Revenue block added in Task 11 */}` with `<RevenueSummary />` and add the import:

```tsx
import { RevenueSummary } from "./_components/revenue-summary";
```

- [ ] **Step 3: Typecheck + build**

Run: `cd /home/pillar/Dev/sitehaus && pnpm check-types && pnpm build --filter=commerce`
Expected: PASS. If `ChartConfig`/`ChartContainer` are not exported from `base/chart`, open `packages/ui/src/components/base/chart.tsx` and import the actual exported names.

- [ ] **Step 4: Visual + unit check** — confirm the revenue figure matches a known month total (validates the cents-vs-dollars assumption from Step 1); confirm the sparkline renders in terracotta.

- [ ] **Step 5: Commit**

```bash
cd /home/pillar/Dev/sitehaus
git add "apps/commerce/app/[storeSlug]/(admin)/orders/_components/revenue-summary.tsx" \
        "apps/commerce/app/[storeSlug]/(admin)/orders/page.tsx"
git commit -m ":sparkles: commerce — revenue summary (figure + shadcn sparkline) in Orders header"
```

---

## Verification (whole feature)

- [ ] `cd ~/Dev/sitehaus-commerce/apps/worker && pnpm test && pnpm build` — worker green.
- [ ] `cd /home/pillar/Dev/sitehaus && pnpm check-types && pnpm build --filter=commerce` — frontend green.
- [ ] Manual: Orders page shows zero `pending` rows in the count/table/cards; abandoned drawer holds them; ship + collect flows work; dashboard Recent Orders excludes pending; after the worker runs (or manually enqueue `order.expire`), pending rows older than 72h flip to `cancelled` and drop out of the drawer.
