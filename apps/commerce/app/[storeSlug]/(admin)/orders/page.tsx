"use client";

import { collectOrder, getMyStore, listOrders, shipOrder, type OrderStatus } from "@/lib/commerce";
import { REAL_ORDER_STATUSES } from "@/lib/order-display";
import { formatCents, formatDate } from "@/lib/format";
import { useStoreNav } from "@/lib/use-store-nav";
import { Avatar, AvatarFallback } from "@site-haus/ui/components/base/avatar";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@site-haus/ui/components/base/dialog";
import { Input } from "@site-haus/ui/components/base/input";
import { Label } from "@site-haus/ui/components/base/label";
import { TableCell } from "@site-haus/ui/components/base/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShoppingCart, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { OrderStatusBadge } from "./_components/order-status-badge";
import { OrderFilterCards, type OrderFilterKey } from "./_components/order-filter-cards";
import { AbandonedDrawer } from "./_components/abandoned-drawer";
import { RevenueSummary } from "./_components/revenue-summary";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableShell } from "@/components/ui/data-table-shell";

const LIMIT = 20;

const FILTER_STATUSES: Record<OrderFilterKey, OrderStatus[]> = {
  all: REAL_ORDER_STATUSES,
  confirmed: ["confirmed"],
  shipped: ["shipped"],
  delivered: ["delivered"],
  refunded: ["refunded"],
  cancelled: ["cancelled"],
};

function useOrderCount(key: OrderFilterKey) {
  return useQuery({
    queryKey: ["orders", "count", key],
    queryFn: () => listOrders({ status: FILTER_STATUSES[key], limit: 1 }).then((r) => r.total),
  });
}

export default function OrdersPage() {
  const { push } = useStoreNav();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<OrderFilterKey>("all");
  const [email, setEmail] = useState("");
  const [emailSearch, setEmailSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [shipOrderId, setShipOrderId] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");

  const { data: store } = useQuery({ queryKey: ["store"], queryFn: getMyStore });
  const fulfillmentType = store?.fulfillmentType ?? "shipping";

  // ── card counts (total only) ──
  const allCount = useOrderCount("all");
  const confirmedCount = useOrderCount("confirmed");
  const shippedCount = useOrderCount("shipped");
  const deliveredCount = useOrderCount("delivered");
  const refundedCount = useOrderCount("refunded");
  const cancelledCount = useOrderCount("cancelled");

  const counts: Record<OrderFilterKey, number | undefined> = {
    all: allCount.data,
    confirmed: confirmedCount.data,
    shipped: shippedCount.data,
    delivered: deliveredCount.data,
    refunded: refundedCount.data,
    cancelled: cancelledCount.data,
  };

  // ── abandoned (pending) ──
  const { data: pendingData } = useQuery({
    queryKey: ["orders", "pending"],
    queryFn: () => listOrders({ status: ["pending"], limit: 50, sort: "newest" }),
  });

  // ── main list ──
  const { data, isLoading } = useQuery({
    queryKey: ["orders", "list", filter, emailSearch, offset],
    queryFn: () =>
      listOrders({
        status: FILTER_STATUSES[filter],
        email: emailSearch || undefined,
        limit: LIMIT,
        offset,
        sort: "newest",
      }),
  });

  const shipMutation = useMutation({
    mutationFn: () => shipOrder(shipOrderId!, trackingNumber),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order marked as shipped");
      setShipOrderId(null);
      setTrackingNumber("");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to ship order"),
  });

  const collectMutation = useMutation({
    mutationFn: (orderId: string) => collectOrder(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order marked as collected");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to collect order"),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  function handleSelect(key: OrderFilterKey) {
    setFilter(key);
    setOffset(0);
  }

  function handleEmailSearch(e: React.FormEvent) {
    e.preventDefault();
    setEmailSearch(email);
    setOffset(0);
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={
          allCount.data === undefined
            ? "—"
            : `${allCount.data} order${allCount.data !== 1 ? "s" : ""}`
        }
        aside={<RevenueSummary />}
      />

      <OrderFilterCards active={filter} onSelect={handleSelect} counts={counts} />

      <form onSubmit={handleEmailSearch} className="mt-6 mb-4 flex gap-2">
        <Input
          placeholder="Search by email..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-56"
        />
        <Button type="submit" variant="outline" size="sm">
          Search
        </Button>
        {emailSearch && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setEmail("");
              setEmailSearch("");
              setOffset(0);
            }}
          >
            Clear
          </Button>
        )}
      </form>

      <DataTableShell
        columns={[
          { header: "Order" },
          { header: "Customer" },
          { header: "Status" },
          { header: "Items" },
          { header: "Total" },
          { header: "Date" },
          { header: "Action", className: "text-right" },
        ]}
        rows={data?.items ?? []}
        getRowKey={(o) => o.id}
        isLoading={isLoading}
        onRowClick={(o) => push(`/orders/${o.id}`)}
        empty={{ icon: ShoppingCart, title: "No orders found" }}
        page={currentPage}
        totalPages={totalPages}
        onPageChange={(p) => setOffset((p - 1) * LIMIT)}
        renderRow={(order) => (
          <>
            <TableCell className="font-numeric-id text-sm font-medium">
              #{order.id.slice(0, 8).toUpperCase()}
            </TableCell>
            <TableCell>
              <span className="flex items-center gap-2">
                <Avatar className="size-7">
                  <AvatarFallback className="text-[11px]">
                    {order.email.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground">{order.email}</span>
              </span>
            </TableCell>
            <TableCell>
              <OrderStatusBadge status={order.status} />
            </TableCell>
            <TableCell className="text-muted-foreground">{order.itemCount}</TableCell>
            <TableCell className="font-medium">
              {formatCents(order.totalCents, order.currency)}
            </TableCell>
            <TableCell className="text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
              {order.status === "confirmed" &&
                (fulfillmentType === "pickup" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => collectMutation.mutate(order.id)}
                    disabled={collectMutation.isPending}
                  >
                    {collectMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                    Mark collected
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      setShipOrderId(order.id);
                      setTrackingNumber("");
                    }}
                  >
                    <Truck className="size-3.5" />
                    Ship
                  </Button>
                ))}
            </TableCell>
          </>
        )}
      />

      <AbandonedDrawer
        items={pendingData?.items ?? []}
        total={pendingData?.total ?? 0}
        onOpenOrder={(id) => push(`/orders/${id}`)}
      />

      <Dialog
        open={!!shipOrderId}
        onOpenChange={(o) => {
          if (!o) {
            setShipOrderId(null);
            setTrackingNumber("");
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark as Shipped</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Tracking Number</Label>
            <Input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. 1Z999AA10123456784"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && trackingNumber.trim()) shipMutation.mutate();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShipOrderId(null);
                setTrackingNumber("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => shipMutation.mutate()}
              disabled={shipMutation.isPending || !trackingNumber.trim()}
            >
              {shipMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Confirm & notify buyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
