"use client";

import { getOrder, refundOrder, shipOrder } from "@/lib/commerce";
import { Button } from "@site-haus/ui/components/base/button";
import { Card, CardContent, CardHeader, CardTitle } from "@site-haus/ui/components/base/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@site-haus/ui/components/base/dialog";
import { Input } from "@site-haus/ui/components/base/input";
import { Label } from "@site-haus/ui/components/base/label";
import { Separator } from "@site-haus/ui/components/base/separator";
import { Skeleton } from "@site-haus/ui/components/base/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@site-haus/ui/components/base/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, RotateCcw, Truck } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { OrderStatusBadge } from "../_components/order-status-badge";

function formatCents(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrder(id),
  });

  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);

  const shipMutation = useMutation({
    mutationFn: () => shipOrder(id, trackingNumber),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", id] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order marked as shipped");
      setShipDialogOpen(false);
      setTrackingNumber("");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to ship order"),
  });

  const refundMutation = useMutation({
    mutationFn: () => refundOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", id] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order refunded");
      setRefundDialogOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to refund order"),
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  if (!order) return null;

  const canShip = order.status === "confirmed";
  const canRefund = order.status === "confirmed" || order.status === "shipped";
  const ref = order.id.slice(0, 8).toUpperCase();

  const hasShipping = order.shippingLine1 || order.shippingName;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/orders")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-mono">#{ref}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{order.email}</p>
        </div>
        <div className="flex gap-2">
          {canShip && (
            <Button size="sm" onClick={() => setShipDialogOpen(true)}>
              <Truck className="size-4" />
              Mark Shipped
            </Button>
          )}
          {canRefund && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setRefundDialogOpen(true)}
            >
              <RotateCcw className="size-4" />
              Refund
            </Button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Placed</p>
            <p className="font-medium">{formatDate(order.createdAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Confirmed</p>
            <p className="font-medium">{formatDate(order.confirmedAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Shipped</p>
            <p className="font-medium">{formatDate(order.shippedAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tracking #</p>
            <p className="font-medium">{order.trackingNumber ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead className="text-right">Unit</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">{item.variantName}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {item.sku ?? "—"}
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCents(item.unitPriceCents, order.currency)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCents(item.totalCents, order.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-6 py-4 space-y-1.5 text-sm border-t">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCents(order.subtotalCents, order.currency)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping</span>
              <span>{formatCents(order.shippingCents, order.currency)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax</span>
              <span>{formatCents(order.taxCents, order.currency)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span>{formatCents(order.totalCents, order.currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipping address */}
      {hasShipping && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-0.5">
            {order.shippingName && <p className="font-medium">{order.shippingName}</p>}
            {order.shippingLine1 && <p>{order.shippingLine1}</p>}
            {order.shippingLine2 && <p>{order.shippingLine2}</p>}
            {(order.shippingCity || order.shippingState || order.shippingZip) && (
              <p>
                {[order.shippingCity, order.shippingState, order.shippingZip]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ship dialog */}
      <Dialog open={shipDialogOpen} onOpenChange={(o) => !o && setShipDialogOpen(false)}>
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
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShipDialogOpen(false)}>
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

      {/* Refund dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={(o) => !o && setRefundDialogOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Refund Order #{ref}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This will issue a full refund of {formatCents(order.totalCents, order.currency)} via
            Stripe. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => refundMutation.mutate()}
              disabled={refundMutation.isPending}
            >
              {refundMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Issue Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
