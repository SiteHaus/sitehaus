"use client";

import {
  collectOrder,
  getMyStore,
  listOrders,
  shipOrder,
  type AdminOrderSummary,
  type OrderStatus,
} from "@/lib/commerce";
import { useStoreNav } from "@/lib/use-store-nav";
import { PageHero } from "@/components/page-hero";
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
import { Skeleton } from "@site-haus/ui/components/base/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@site-haus/ui/components/base/table";
import { Tabs, TabsList, TabsTrigger } from "@site-haus/ui/components/base/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, Loader2, Package, ShoppingCart, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { OrderStatusBadge } from "./_components/order-status-badge";

const LIMIT = 20;

const STATUS_TABS: { label: string; value: OrderStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Paid", value: "confirmed" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Refunded", value: "refunded" },
  { label: "Cancelled", value: "cancelled" },
];

function formatCents(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function OrdersPage() {
  const { push } = useStoreNav();
  const qc = useQueryClient();
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [email, setEmail] = useState("");
  const [emailSearch, setEmailSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [awaitingOpen, setAwaitingOpen] = useState(false);
  const [shipOrderId, setShipOrderId] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");

  const { data: store } = useQuery({ queryKey: ["store"], queryFn: getMyStore });
  const fulfillmentType = store?.fulfillmentType ?? "shipping";

  const { data: actionQueueData, isLoading: actionQueueLoading } = useQuery({
    queryKey: ["orders", "confirmed-queue"],
    queryFn: () => listOrders({ status: "confirmed", limit: 50, sort: "newest" }),
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

  const { data, isLoading } = useQuery({
    queryKey: ["orders", status, emailSearch, offset],
    queryFn: () =>
      listOrders({
        status: status === "all" ? undefined : status,
        email: emailSearch || undefined,
        limit: LIMIT,
        offset,
        sort: "newest",
      }),
  });

  const { data: awaitingData } = useQuery({
    queryKey: ["orders", "pending-summary"],
    queryFn: () => listOrders({ status: "pending", limit: 50, sort: "newest" }),
  });

  const awaitingTotal = awaitingData?.total ?? 0;

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  function handleStatusChange(value: string) {
    setStatus(value as OrderStatus | "all");
    setOffset(0);
  }

  function handleEmailSearch(e: React.FormEvent) {
    e.preventDefault();
    setEmailSearch(email);
    setOffset(0);
  }

  return (
    <div>
      <PageHero
        icon={ShoppingCart}
        title="Orders"
        subtitle={isLoading ? "—" : `${total} order${total !== 1 ? "s" : ""}`}
      />

      <form onSubmit={handleEmailSearch} className="flex gap-2 mb-6">
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

      {/* Action queue */}
      <div className="border rounded-lg mb-6">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          {fulfillmentType === "pickup" ? (
            <Package className="size-4 text-muted-foreground" />
          ) : (
            <Truck className="size-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            {fulfillmentType === "pickup" ? "Ready for Pickup" : "Ready to Ship"}
          </span>
          {!actionQueueLoading && (
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              {actionQueueData?.total ?? 0}
            </span>
          )}
        </div>
        {actionQueueLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : actionQueueData?.items.length === 0 ? (
          <div className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-green-500 shrink-0" />
            You&apos;re all caught up
          </div>
        ) : (
          <Table>
            <TableBody>
              {actionQueueData?.items.map((order: AdminOrderSummary) => (
                <TableRow key={order.id}>
                  <TableCell
                    className="font-mono text-sm font-medium cursor-pointer"
                    onClick={() => push(`/orders/${order.id}`)}
                  >
                    #{order.id.slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell
                    className="text-muted-foreground cursor-pointer"
                    onClick={() => push(`/orders/${order.id}`)}
                  >
                    {order.email}
                  </TableCell>
                  <TableCell
                    className="text-muted-foreground cursor-pointer"
                    onClick={() => push(`/orders/${order.id}`)}
                  >
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {fulfillmentType === "pickup" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => collectMutation.mutate(order.id)}
                        disabled={collectMutation.isPending}
                      >
                        {collectMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                        Mark Collected
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
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Tabs value={status} onValueChange={handleStatusChange} className="mb-4">
        <TabsList>
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <ShoppingCart className="size-10 mb-3 opacity-30" />
                    <p className="font-medium">No orders found</p>
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
                  <TableCell className="font-mono text-sm font-medium">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{order.email}</TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{order.itemCount}</TableCell>
                  <TableCell className="font-medium">
                    {formatCents(order.totalCents, order.currency)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + LIMIT >= total}
              onClick={() => setOffset((o) => o + LIMIT)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

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
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {awaitingTotal > 0 && (
        <div className="mt-6 border rounded-lg overflow-hidden">
          <button
            className="flex items-center gap-2 w-full px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            onClick={() => setAwaitingOpen((v) => !v)}
          >
            <ChevronDown
              className={`size-4 transition-transform ${awaitingOpen ? "rotate-180" : ""}`}
            />
            <span className="font-medium">Awaiting Payment</span>
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              {awaitingTotal}
            </span>
          </button>
          {awaitingOpen && (
            <div className="border-t opacity-60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {awaitingData?.items.map((order: AdminOrderSummary) => (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer"
                      onClick={() => push(`/orders/${order.id}`)}
                    >
                      <TableCell className="font-mono text-sm font-medium">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell>{order.email}</TableCell>
                      <TableCell>{order.itemCount}</TableCell>
                      <TableCell>{formatCents(order.totalCents, order.currency)}</TableCell>
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {awaitingTotal > 50 && (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  Showing 50 of {awaitingTotal}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
