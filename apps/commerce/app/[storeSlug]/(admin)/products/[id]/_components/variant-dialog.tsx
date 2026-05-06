"use client";

import {
  createVariant,
  updateVariant,
  type ProductOption,
  type VariantAdmin,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@site-haus/ui/components/base/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type State = { mode: "create" } | { mode: "edit"; variant: VariantAdmin };

type Props = {
  open: boolean;
  onClose: () => void;
  state: State;
  productId: string;
  options: ProductOption[];
};

function formatCents(cents: number) {
  return (cents / 100).toFixed(2);
}

function parseDollars(val: string) {
  return Math.round(parseFloat(val) * 100);
}

function suggestName(options: ProductOption[], selected: Record<string, string>) {
  const parts = options
    .map((o) => {
      const valueId = selected[o.id];
      return o.values.find((v) => v.id === valueId)?.value;
    })
    .filter(Boolean);
  return parts.join(" / ");
}

export function VariantDialog({ open, onClose, state, productId, options }: Props) {
  const qc = useQueryClient();
  const isEdit = state.mode === "edit";

  const [name, setName] = useState("");
  const [nameDirty, setNameDirty] = useState(false);
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [compareAt, setCompareAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({});

  const sortedOptions = [...options].sort((a, b) => a.sortOrder - b.sortOrder);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      const v = state.variant;
      setName(v.name);
      setNameDirty(true);
      setSku(v.sku ?? "");
      setPrice(formatCents(v.priceCents));
      setCompareAt(v.compareAtCents ? formatCents(v.compareAtCents) : "");
      setIsActive(v.isActive);
      const preSelected: Record<string, string> = {};
      for (const ov of v.optionValues) {
        preSelected[ov.optionId] = ov.valueId;
      }
      setSelectedValues(preSelected);
    } else {
      setName("");
      setNameDirty(false);
      setSku("");
      setPrice("");
      setCompareAt("");
      setIsActive(true);
      setSelectedValues({});
    }
  }, [open]);

  function handleValueSelect(optionId: string, valueId: string) {
    const next = { ...selectedValues, [optionId]: valueId };
    setSelectedValues(next);
    if (!nameDirty) {
      setName(suggestName(sortedOptions, next));
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const priceCents = parseDollars(price);
      const compareAtCents = compareAt ? parseDollars(compareAt) : undefined;
      const optionValueIds = Object.values(selectedValues).filter(Boolean);

      if (isEdit) {
        return updateVariant(state.variant.id, {
          name,
          sku: sku || undefined,
          priceCents,
          compareAtCents,
          isActive,
          optionValueIds: optionValueIds.length ? optionValueIds : undefined,
        });
      }
      return createVariant(productId, {
        name,
        sku: sku || undefined,
        priceCents,
        compareAtCents,
        isActive,
        optionValueIds: optionValueIds.length ? optionValueIds : undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product", productId] });
      toast.success(isEdit ? "Variant updated" : "Variant added");
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save variant"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Variant" : "Add Variant"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {sortedOptions.length > 0 && (
            <div className="space-y-3">
              {sortedOptions.map((option) => (
                <div key={option.id} className="space-y-2">
                  <Label>{option.name}</Label>
                  <Select
                    value={selectedValues[option.id] ?? ""}
                    onValueChange={(v) => handleValueSelect(option.id, v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${option.name.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {[...option.values]
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.value}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameDirty(true);
              }}
              placeholder={sortedOptions.length ? "Auto-filled from options" : "e.g. 60 Capsules"}
              autoFocus={sortedOptions.length === 0}
            />
          </div>

          <div className="space-y-2">
            <Label>SKU</Label>
            <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Optional" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Price ($)</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Compare at ($)</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={compareAt}
                onChange={(e) => setCompareAt(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Availability</Label>
            <Select
              value={isActive ? "active" : "inactive"}
              onValueChange={(v) => setIsActive(v === "active")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !name.trim() || !price}
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "Save" : "Add Variant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
