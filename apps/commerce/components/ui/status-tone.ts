import type { OrderStatus, ProductStatus } from "@/lib/commerce";
import { type Tone, toneClass } from "@site-haus/ui/components/shared/status-tone";

export { type Tone, toneClass };

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
