import { Badge } from "@site-haus/ui/components/base/badge";
import type { OrderStatus } from "@/lib/commerce";

const config: Record<OrderStatus, { label: string; className: string }> = {
  pending: {
    label: "Awaiting Payment",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  confirmed: {
    label: "Paid",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  shipped: {
    label: "Shipped",
    className: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  },
  delivered: {
    label: "Delivered",
    className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },
  failed: {
    label: "Payment Failed",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
  refunded: {
    label: "Refunded",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, className } = config[status];
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}
