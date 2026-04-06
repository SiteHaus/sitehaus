"use client";

import {
  getInventory,
  updateInventory,
  type InventoryItem,
  type VariantAdmin,
} from "@/lib/commerce";
import { Badge } from "@site-haus/ui/components/base/badge";
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
import { Switch } from "@site-haus/ui/components/base/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@site-haus/ui/components/base/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function StockBadge({ available }: { available: number }) {
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

function AdjustDialog({
  variant,
  open,
  onClose,
  productId,
}: {
  variant: VariantAdmin;
  open: boolean;
  onClose: () => void;
  productId: string;
}) {
  const qc = useQueryClient();
  const [stock, setStock] = useState("");
  const [allowBackorder, setAllowBackorder] = useState(false);

  const { data: inv, isLoading: invLoading } = useQuery({
    queryKey: ["inventory", variant.id],
    queryFn: () => getInventory(variant.id),
    enabled: open,
  });

  useEffect(() => {
    if (inv) {
      setStock(String(inv.stock));
      setAllowBackorder(inv.allowBackorder);
    }
  }, [inv]);

  const mutation = useMutation({
    mutationFn: () => {
      const parsed = parseInt(stock, 10);
      return updateInventory(variant.id, {
        stock: isNaN(parsed) ? undefined : parsed,
        allowBackorder,
      });
    },
    onSuccess: (updated) => {
      qc.setQueryData(["inventory", variant.id], updated);
      qc.invalidateQueries({ queryKey: ["product", productId] });
      toast.success("Inventory updated");
      onClose();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to update inventory"),
  });

  const stockNum = parseInt(stock, 10);
  const belowReserved = !isNaN(stockNum) && inv && stockNum < inv.reserved;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Adjust Inventory — {variant.name}</DialogTitle>
        </DialogHeader>

        {invLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : inv ? (
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-md bg-muted px-3 py-2">
                <p className="text-xs text-muted-foreground mb-1">Reserved</p>
                <p className="font-semibold">{inv.reserved}</p>
              </div>
              <div className="rounded-md bg-muted px-3 py-2">
                <p className="text-xs text-muted-foreground mb-1">Available</p>
                <p className="font-semibold">{inv.available}</p>
              </div>
              <div className="rounded-md bg-muted px-3 py-2">
                <p className="text-xs text-muted-foreground mb-1">TTL</p>
                <p className="font-semibold">{inv.reservationTtlMinutes}m</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock-input">Stock (total units)</Label>
              <Input
                id="stock-input"
                type="number"
                min={inv.reserved}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
              {belowReserved && (
                <p className="text-xs text-destructive">
                  Cannot be less than reserved units ({inv.reserved})
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="backorder-switch">Allow backorders</Label>
                <p className="text-xs text-muted-foreground">
                  Let customers order when out of stock
                </p>
              </div>
              <Switch
                id="backorder-switch"
                checked={allowBackorder}
                onCheckedChange={setAllowBackorder}
              />
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || invLoading || !!belowReserved || stock === ""}
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InventoryCard({
  productId,
  variants,
}: {
  productId: string;
  variants: VariantAdmin[];
}) {
  const [adjusting, setAdjusting] = useState<VariantAdmin | null>(null);

  if (variants.length === 0) return null;

  return (
    <>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Inventory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variant</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((v) => {
                const available = v.stock - v.reserved;
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell className="text-right">{v.stock}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{v.reserved}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <StockBadge available={available} />
                        <span>{available}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setAdjusting(v)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {adjusting && (
        <AdjustDialog
          variant={adjusting}
          open={!!adjusting}
          onClose={() => setAdjusting(null)}
          productId={productId}
        />
      )}
    </>
  );
}
