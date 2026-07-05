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
