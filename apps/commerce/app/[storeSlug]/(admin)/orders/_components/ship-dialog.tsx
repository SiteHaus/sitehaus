"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@site-haus/ui/components/base/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@site-haus/ui/components/base/tabs";
import { Input } from "@site-haus/ui/components/base/input";
import { Label } from "@site-haus/ui/components/base/label";
import { Loader2 } from "lucide-react";
import { buyLabel, getOriginAddress, getShippingRates, shipOrder } from "@/lib/commerce";
import { useFormatCents } from "@/lib/use-format-cents";
import { useStoreNav } from "@/lib/use-store-nav";

interface ShipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onShipped: () => void;
}

export function ShipDialog({ open, onOpenChange, orderId, onShipped }: ShipDialogProps) {
  const formatCents = useFormatCents();
  const { push } = useStoreNav();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shipmentId, setShipmentId] = useState<string | null>(null);
  const [rates, setRates] = useState<
    | {
        rateId: string;
        carrier: string;
        service: string;
        amountCents: number;
        estimatedDays: number | null;
      }[]
    | null
  >(null);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [ratesError, setRatesError] = useState<{
    error: string;
    variants?: { variantName: string }[];
    setupUrl?: string;
  } | null>(null);
  const queryClient = useQueryClient();

  const { data: origin } = useQuery({
    queryKey: ["shipping-origin"],
    queryFn: getOriginAddress,
    enabled: open,
  });

  const ratesMutation = useMutation({
    mutationFn: () => getShippingRates(orderId),
    onSuccess: (result) => {
      if ("error" in result) {
        setRatesError(result);
        return;
      }
      setShipmentId(result.shipmentId);
      setRates(result.rates);
      setSelectedRateId(result.rates[0]?.rateId ?? null);
    },
    onError: () => toast.error("Couldn't fetch shipping rates — try again."),
  });

  // Every possible rate populates automatically the moment the Buy tab is open —
  // the merchant never has to ask for a quote, and never sees a bare "Buy" button
  // without a real, itemized cost in front of it first.
  useEffect(() => {
    if (open && rates === null && !ratesMutation.isPending) {
      ratesMutation.mutate();
    }
    if (!open) {
      setShipmentId(null);
      setRates(null);
      setSelectedRateId(null);
      setRatesError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const buyMutation = useMutation({
    mutationFn: () => buyLabel(orderId, shipmentId!, selectedRateId!),
    onSuccess: (result) => {
      if ("error" in result) {
        if (result.error === "rate_expired") {
          // Rates are short-lived — the selected one can expire between fetching
          // and buying. Refresh the list rather than leaving the merchant stuck
          // on a card-billing message that has nothing to do with the problem.
          toast.error("That rate is no longer available — refreshing rates.");
          setRates(null);
          setSelectedRateId(null);
          ratesMutation.mutate();
          return;
        }
        if (result.error === "not_found") {
          toast.error("Couldn't find this order — try reopening it.");
          return;
        }
        toast.error(
          "Your postage balance couldn't be charged — update your card to keep buying labels.",
        );
        return;
      }
      toast.success(`Label bought — tracking ${result.trackingCode}`);
      window.open(result.labelUrl, "_blank");
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      onShipped();
      onOpenChange(false);
    },
    onError: () => toast.error("Couldn't buy the label — try again."),
  });

  const manualMutation = useMutation({
    mutationFn: () => shipOrder(orderId, trackingNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order marked as shipped");
      onShipped();
      onOpenChange(false);
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Couldn't mark this order shipped — try again.",
      ),
  });

  const hasOrigin = !!origin?.originLine1;
  const selectedRate = rates?.find((r) => r.rateId === selectedRateId);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setTrackingNumber("");
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ship this order</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="buy">
          <TabsList>
            <TabsTrigger value="buy">Buy a label</TabsTrigger>
            <TabsTrigger value="manual">Enter tracking manually</TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="space-y-4 pt-4">
            {!hasOrigin && (
              <p className="text-sm text-muted-foreground">
                First label for this store — we&apos;ll ask for your ship-from address and set up
                postage billing as part of this purchase. SiteHaus buys real USPS/UPS/FedEx postage
                on your behalf and bills your card automatically once your unpaid postage reaches
                $50, or at month&apos;s end, whichever comes first. Every charge is visible in
                Settings → Shipping → Labels.
              </p>
            )}

            {ratesMutation.isPending && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {ratesError && (
              <div className="space-y-2">
                {ratesError.error === "missing_weight" && (
                  <p className="text-sm text-destructive">
                    Missing weight for: {ratesError.variants?.map((v) => v.variantName).join(", ")}{" "}
                    — add it on the product page, then reopen this dialog.
                  </p>
                )}
                {ratesError.error === "billing_setup_required" && (
                  <div className="space-y-2">
                    <p className="text-sm text-destructive">
                      Add a card to your postage billing before buying labels.
                    </p>
                    {ratesError.setupUrl && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(ratesError.setupUrl, "_blank")}
                      >
                        Add card
                      </Button>
                    )}
                  </div>
                )}
                {ratesError.error === "billing_blocked" && (
                  <p className="text-sm text-destructive">
                    Your postage balance couldn&apos;t be charged — update your card to keep buying
                    labels.
                  </p>
                )}
                {ratesError.error === "not_found" && (
                  <p className="text-sm text-destructive">
                    Couldn&apos;t find this order&apos;s shipment details — try again.
                  </p>
                )}
                {ratesError.error === "origin_required" && (
                  <div className="space-y-2">
                    <p className="text-sm text-destructive">
                      You need a ship-from address before buying labels.
                    </p>
                    <Button variant="outline" onClick={() => push("/shipping?tab=labels")}>
                      Add ship-from address
                    </Button>
                  </div>
                )}
              </div>
            )}

            {ratesMutation.isError && !ratesError && (
              <div className="space-y-2">
                <p className="text-sm text-destructive">
                  Couldn&apos;t fetch shipping rates — try again.
                </p>
                <Button variant="outline" onClick={() => ratesMutation.mutate()}>
                  Try again
                </Button>
              </div>
            )}

            {rates && rates.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No shipping rates are available for this destination. Double-check the order&apos;s
                shipping address, or use the &quot;Enter tracking manually&quot; tab instead.
              </p>
            )}

            {rates && rates.length > 0 && (
              <div className="space-y-2">
                {rates.map((rate) => (
                  <label
                    key={rate.rateId}
                    className={`flex cursor-pointer items-center justify-between rounded-md border p-3 text-sm ${
                      selectedRateId === rate.rateId
                        ? "border-primary ring-1 ring-primary"
                        : "border-border"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="rate"
                        checked={selectedRateId === rate.rateId}
                        onChange={() => setSelectedRateId(rate.rateId)}
                      />
                      <span>
                        {rate.carrier} {rate.service}
                        {rate.estimatedDays
                          ? ` · ${rate.estimatedDays} day${rate.estimatedDays === 1 ? "" : "s"}`
                          : ""}
                      </span>
                    </span>
                    <span className="font-medium">{formatCents(rate.amountCents)}</span>
                  </label>
                ))}
              </div>
            )}

            {rates && rates.length > 0 && (
              <Button
                onClick={() => buyMutation.mutate()}
                disabled={buyMutation.isPending || !selectedRateId}
                className="w-full"
              >
                {buyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : selectedRate ? (
                  `Buy & Print Label — ${formatCents(selectedRate.amountCents)}`
                ) : (
                  "Select a rate"
                )}
              </Button>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 pt-4">
            <Label htmlFor="tracking">Tracking number</Label>
            <Input
              id="tracking"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. 1Z999AA10123456784"
              onKeyDown={(e) => {
                if (e.key === "Enter" && trackingNumber.trim()) manualMutation.mutate();
              }}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => manualMutation.mutate()}
                disabled={manualMutation.isPending || !trackingNumber.trim()}
              >
                {manualMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm & notify buyer
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
