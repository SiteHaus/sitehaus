import type { OrderStatus } from "./commerce";

/**
 * Statuses that count as real orders (they were paid). Never-paid checkouts —
 * `pending`, `abandoned`, `failed` — are excluded; abandoned/pending live in
 * the Abandoned checkouts drawer instead. `cancelled` stays here for a real,
 * paid order that gets explicitly cancelled.
 */
export const REAL_ORDER_STATUSES: OrderStatus[] = [
  "confirmed",
  "shipped",
  "delivered",
  "refunded",
  "cancelled",
];

const LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  failed: "Payment failed",
  refunded: "Refunded",
  cancelled: "Cancelled",
  abandoned: "Abandoned",
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
  abandoned: "var(--muted-foreground)",
};

export function statusDotColor(s: OrderStatus): string {
  return DOT[s];
}
