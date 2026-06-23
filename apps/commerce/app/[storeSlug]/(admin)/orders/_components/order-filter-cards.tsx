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
