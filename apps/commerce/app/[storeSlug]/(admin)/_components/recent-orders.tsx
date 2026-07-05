"use client";

import { listOrders, type AdminOrderSummary } from "@/lib/commerce";
import { REAL_ORDER_STATUSES } from "@/lib/order-display";
import { formatCents, formatDate } from "@/lib/format";
import { useStoreNav } from "@/lib/use-store-nav";
import { Button } from "@site-haus/ui/components/base/button";
import { Skeleton } from "@site-haus/ui/components/base/skeleton";
import { SectionCard } from "@/components/ui/section-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@site-haus/ui/components/base/table";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
import { OrderStatusBadge } from "../orders/_components/order-status-badge";

export function RecentOrders() {
  const { push } = useStoreNav();

  const { data, isLoading } = useQuery({
    queryKey: ["orders", "recent"],
    queryFn: () => listOrders({ status: REAL_ORDER_STATUSES, limit: 8, sort: "newest" }),
  });

  return (
    <SectionCard
      title="Recent orders"
      actions={
        <Button variant="ghost" size="sm" onClick={() => push("/orders")}>
          View all
        </Button>
      }
    >
      <div className="-mx-6 -mb-6 overflow-hidden rounded-b-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <ShoppingCart className="size-8 mb-2 opacity-30" />
                    <p className="text-sm">No orders yet</p>
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
                  <TableCell className="font-mono text-xs font-medium">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{order.email}</TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatCents(order.totalCents, order.currency)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  );
}
