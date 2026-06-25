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
