"use client";

import {
  createShippingRate,
  deleteShippingRate,
  type ShippingRate,
  updateShippingRate,
} from "@/lib/commerce";
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
import { Tabs, TabsList, TabsTrigger } from "@site-haus/ui/components/base/tabs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type RateType = "flat" | "free";

type Props = {
  open: boolean;
  onClose: () => void;
  zoneId: string;
  rate?: ShippingRate;
};

function centsToDisplay(cents: number) {
  return (cents / 100).toFixed(2);
}

function parseDollars(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : Math.round(n * 100);
}

export function RateDialog({ open, onClose, zoneId, rate }: Props) {
  const qc = useQueryClient();
  const isEdit = !!rate;

  const initialType: RateType =
    rate && rate.rateCents === 0 && rate.minOrderCents !== undefined ? "free" : "flat";

  const [name, setName] = useState(rate?.name ?? "");
  const [rateType, setRateType] = useState<RateType>(initialType);
  const [rateDollars, setRateDollars] = useState(
    rate && rate.rateCents > 0 ? centsToDisplay(rate.rateCents) : "",
  );
  const [thresholdDollars, setThresholdDollars] = useState(
    rate?.minOrderCents !== undefined ? centsToDisplay(rate.minOrderCents) : "",
  );
  const [estimatedDays, setEstimatedDays] = useState(
    rate?.estimatedDays !== undefined ? String(rate.estimatedDays) : "",
  );
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  function reset() {
    setName(rate?.name ?? "");
    setRateType(initialType);
    setRateDollars(rate && rate.rateCents > 0 ? centsToDisplay(rate.rateCents) : "");
    setThresholdDollars(
      rate?.minOrderCents !== undefined ? centsToDisplay(rate.minOrderCents) : "",
    );
    setEstimatedDays(rate?.estimatedDays !== undefined ? String(rate.estimatedDays) : "");
    setDeleteConfirm(false);
  }

  function buildPayload() {
    const days = estimatedDays ? parseInt(estimatedDays, 10) : undefined;
    if (rateType === "flat") {
      return {
        name,
        rateCents: parseDollars(rateDollars),
        estimatedDays: days,
      };
    }
    return {
      name,
      rateCents: 0,
      minOrderCents: parseDollars(thresholdDollars),
      estimatedDays: days,
    };
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      isEdit
        ? updateShippingRate(zoneId, rate.id, buildPayload())
        : createShippingRate(zoneId, buildPayload()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipping-zones"] });
      toast.success(isEdit ? "Rate updated" : "Rate added");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteShippingRate(zoneId, rate!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipping-zones"] });
      toast.success("Rate deleted");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canSave =
    name.trim().length > 0 && (rateType === "flat" ? rateDollars !== "" : thresholdDollars !== "");

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Rate" : "Add Rate"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="rate-name">Name</Label>
            <Input
              id="rate-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard, Express"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <Tabs value={rateType} onValueChange={(v) => setRateType(v as RateType)}>
              <TabsList className="w-full">
                <TabsTrigger value="flat" className="flex-1">
                  Flat Rate
                </TabsTrigger>
                <TabsTrigger value="free" className="flex-1">
                  Free Shipping Threshold
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {rateType === "flat" ? (
            <div className="space-y-1.5">
              <Label htmlFor="rate-amount">Rate</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  $
                </span>
                <Input
                  id="rate-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-7"
                  value={rateDollars}
                  onChange={(e) => setRateDollars(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="rate-threshold">Minimum order for free shipping</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  $
                </span>
                <Input
                  id="rate-threshold"
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-7"
                  value={thresholdDollars}
                  onChange={(e) => setThresholdDollars(e.target.value)}
                  placeholder="50.00"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Orders at or above this value ship free.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="est-days">Estimated delivery days (optional)</Label>
            <Input
              id="est-days"
              type="number"
              min="1"
              value={estimatedDays}
              onChange={(e) => setEstimatedDays(e.target.value)}
              placeholder="e.g. 5"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isEdit && !deleteConfirm && (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive sm:mr-auto"
              onClick={() => setDeleteConfirm(true)}
            >
              Delete rate
            </Button>
          )}
          {isEdit && deleteConfirm && (
            <div className="flex items-center gap-2 sm:mr-auto">
              <span className="text-sm text-destructive">Delete this rate?</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteConfirm(false)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && <Loader2 className="size-3 animate-spin" />}
                Yes, delete
              </Button>
            </div>
          )}
          {!deleteConfirm && (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!canSave || saveMutation.isPending}
              >
                {saveMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                {isEdit ? "Save" : "Add Rate"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
