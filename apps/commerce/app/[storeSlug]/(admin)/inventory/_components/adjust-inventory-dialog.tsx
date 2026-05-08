"use client";

import { updateInventory, type BulkInventoryItem } from "@/lib/commerce";
import { Badge } from "@site-haus/ui/components/base/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@site-haus/ui/components/base/select";
import { Switch } from "@site-haus/ui/components/base/switch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const REASONS = ["Restock", "Damage", "Correction", "Return", "Shrinkage", "Other"] as const;

export function StockBadge({ available }: { available: number }) {
  if (available <= 0)
    return (
      <Badge variant="destructive" className="text-xs">
        Out of stock
      </Badge>
    );
  if (available <= 5)
    return (
      <Badge variant="outline" className="text-xs border-orange-400 text-orange-600">
        Low stock
      </Badge>
    );
  return null;
}

export function AdjustInventoryDialog({
  item,
  open,
  onClose,
}: {
  item: BulkInventoryItem;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [stock, setStock] = useState(String(item.stock));
  const [allowBackorder, setAllowBackorder] = useState(item.allowBackorder);
  const [reason, setReason] = useState<string>("");

  const stockNum = parseInt(stock, 10);
  const belowReserved = !isNaN(stockNum) && stockNum < item.reserved;

  const mutation = useMutation({
    mutationFn: () => {
      const parsed = parseInt(stock, 10);
      return updateInventory(item.variantId, {
        stock: isNaN(parsed) ? undefined : parsed,
        allowBackorder,
        ...(reason && { reason }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Inventory updated");
      onClose();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to update inventory"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Adjust Inventory — {item.variantName}</DialogTitle>
          <p className="text-sm text-muted-foreground">{item.productName}</p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-md bg-muted px-3 py-2">
              <p className="text-xs text-muted-foreground mb-1">Current stock</p>
              <p className="font-semibold text-base">{item.stock}</p>
            </div>
            <div className="rounded-md bg-muted px-3 py-2">
              <p className="text-xs text-muted-foreground mb-1">Reserved</p>
              <p className="font-semibold text-base">{item.reserved}</p>
            </div>
            <div className="rounded-md bg-muted px-3 py-2">
              <p className="text-xs text-muted-foreground mb-1">Available</p>
              <p className="font-semibold text-base">{item.available}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock-input">
              New stock total
              <span className="text-muted-foreground font-normal ml-1">
                (absolute, not a delta)
              </span>
            </Label>
            <Input
              id="stock-input"
              type="number"
              min={item.reserved}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
            {belowReserved && (
              <p className="text-xs text-destructive">
                Cannot be less than reserved units ({item.reserved})
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason-select">Reason (optional)</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason-select">
                <SelectValue placeholder="Select a reason…" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="backorder-switch">Allow backorders</Label>
              <p className="text-xs text-muted-foreground">Let customers order when out of stock</p>
            </div>
            <Switch
              id="backorder-switch"
              checked={allowBackorder}
              onCheckedChange={setAllowBackorder}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !!belowReserved || stock === ""}
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
