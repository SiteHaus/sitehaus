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
  abandoned: "neutral",
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
