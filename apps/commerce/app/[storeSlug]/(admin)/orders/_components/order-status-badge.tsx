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
