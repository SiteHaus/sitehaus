import type { OrderStatus } from "@/lib/commerce";
import { statusLabel } from "@/lib/order-display";
import { StatusBadge } from "@/components/ui/status-badge";
import { orderTone } from "@/components/ui/status-tone";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <StatusBadge tone={orderTone(status)} label={statusLabel(status)} />;
}
