"use client";

import {
  collectOrder,
  getMyStore,
  getOrder,
  refundOrder,
  shipOrder,
  updateShippingAddress,
} from "@/lib/commerce";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { useStoreNav } from "@/lib/use-store-nav";
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
import { ChevronLeft, Loader2, Package, Pencil, RotateCcw, Truck } from "lucide-react";
import { useParams } from "next/navigation";
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
  const { push } = useStoreNav();
  const qc = useQueryClient();

  const { data: store } = useQuery({ queryKey: ["store"], queryFn: getMyStore });
  const fulfillmentType = store?.fulfillmentType ?? "shipping";

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrder(id),
  });

  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [collectDialogOpen, setCollectDialogOpen] = useState(false);

  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [addrName, setAddrName] = useState("");
  const [addrLine1, setAddrLine1] = useState("");
  const [addrLine2, setAddrLine2] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [addrZip, setAddrZip] = useState("");

  function openAddressDialog() {
    setAddrName(order?.shippingName ?? "");
    setAddrLine1(order?.shippingLine1 ?? "");
    setAddrLine2(order?.shippingLine2 ?? "");
    setAddrCity(order?.shippingCity ?? "");
    setAddrState(order?.shippingState ?? "");
    setAddrZip(order?.shippingZip ?? "");
    setAddressDialogOpen(true);
  }

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

  const collectMutation = useMutation({
    mutationFn: () => collectOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", id] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order marked as collected");
      setCollectDialogOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to collect order"),
  });

  const addressMutation = useMutation({
    mutationFn: () =>
      updateShippingAddress(id, {
        name: addrName.trim(),
        line1: addrLine1.trim(),
        line2: addrLine2.trim() || undefined,
        city: addrCity.trim(),
        state: addrState.trim() || undefined,
        zip: addrZip.trim(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", id] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Shipping address saved");
      setAddressDialogOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save address"),
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

  const canShip = order.status === "confirmed" && fulfillmentType === "shipping";
  const canCollect = order.status === "confirmed" && fulfillmentType === "pickup";
  const canRefund = order.status === "confirmed" || order.status === "shipped";
  const ref = order.id.slice(0, 8).toUpperCase();
  const hasShipping = order.shippingLine1 || order.shippingName;

  return (
    <div>
      <PageHeader
        eyebrow="Orders"
        title={`#${ref}`}
        titleClassName="font-numeric-id"
        subtitle={`${order.email} · ${formatDate(order.createdAt)}`}
        aside={<OrderStatusBadge status={order.status} />}
        actions={
          <>
            <Button variant="ghost" onClick={() => push("/orders")}>
              <ChevronLeft className="size-4" />
              Orders
            </Button>
            {canShip && (
              <Button size="sm" onClick={() => setShipDialogOpen(true)}>
                <Truck className="size-4" />
                Mark Shipped
              </Button>
            )}
            {canCollect && (
              <Button size="sm" onClick={() => setCollectDialogOpen(true)}>
                <Package className="size-4" />
                Mark Collected
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
          </>
        }
      />

      <div className="max-w-3xl space-y-4">
        {/* Timeline */}
        <SectionCard title="Timeline">
          <div className="grid grid-cols-2 gap-3 text-sm">
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
          </div>
        </SectionCard>

        {/* Items */}
        <SectionCard title="Items" contentClassName="p-0">
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
        </SectionCard>

        {/* Shipping address */}
        <SectionCard
          title="Shipping Address"
          actions={
            <Button variant="ghost" size="sm" onClick={openAddressDialog}>
              <Pencil className="size-3.5" />
              {hasShipping ? "Edit" : "Add"}
            </Button>
          }
        >
          {hasShipping ? (
            <div className="text-sm space-y-0.5">
              {order.shippingName && <p className="font-medium">{order.shippingName}</p>}
              {order.shippingLine1 ? (
                <>
                  <p>{order.shippingLine1}</p>
                  {order.shippingLine2 && <p>{order.shippingLine2}</p>}
                </>
              ) : (
                <p className="text-muted-foreground italic">Street unavailable</p>
              )}
              {(order.shippingCity || order.shippingState || order.shippingZip) && (
                <p>
                  {[order.shippingCity, order.shippingState, order.shippingZip]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No shipping address on file for this order. Follow up with the customer directly, then
              add it here.
            </p>
          )}
        </SectionCard>
      </div>

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

      {/* Collect dialog */}
      <Dialog open={collectDialogOpen} onOpenChange={(o) => !o && setCollectDialogOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark as Collected?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Confirm that the customer has picked up order #{ref}.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCollectDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => collectMutation.mutate()} disabled={collectMutation.isPending}>
              {collectMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Confirm Pickup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shipping address dialog */}
      <Dialog open={addressDialogOpen} onOpenChange={(o) => !o && setAddressDialogOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{hasShipping ? "Edit" : "Add"} Shipping Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="addr-name">Full name</Label>
              <Input
                id="addr-name"
                value={addrName}
                onChange={(e) => setAddrName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addr-line1">Street address</Label>
              <Input
                id="addr-line1"
                value={addrLine1}
                onChange={(e) => setAddrLine1(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addr-line2">Apt / Suite (optional)</Label>
              <Input
                id="addr-line2"
                value={addrLine2}
                onChange={(e) => setAddrLine2(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1 space-y-1.5">
                <Label htmlFor="addr-city">City</Label>
                <Input
                  id="addr-city"
                  value={addrCity}
                  onChange={(e) => setAddrCity(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addr-state">State</Label>
                <Input
                  id="addr-state"
                  value={addrState}
                  onChange={(e) => setAddrState(e.target.value)}
                  placeholder="UT"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addr-zip">Zip</Label>
                <Input id="addr-zip" value={addrZip} onChange={(e) => setAddrZip(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddressDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addressMutation.mutate()}
              disabled={
                addressMutation.isPending ||
                !addrName.trim() ||
                !addrLine1.trim() ||
                !addrCity.trim() ||
                !addrZip.trim()
              }
            >
              {addressMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
