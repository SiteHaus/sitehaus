"use client";

import {
  createOptionValue,
  deleteOption,
  deleteOptionValue,
  deleteVariant,
  updateOptionValue,
  type OptionValue,
  type ProductOption,
  type VariantAdmin,
} from "@/lib/commerce";
import { Button } from "@site-haus/ui/components/base/button";
import { Card, CardContent, CardHeader, CardTitle } from "@site-haus/ui/components/base/card";
import { Input } from "@site-haus/ui/components/base/input";
import { Separator } from "@site-haus/ui/components/base/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@site-haus/ui/components/base/table";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Lightbulb,
  Loader2,
  Package,
  Pencil,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { OptionDialog } from "./option-dialog";
import { VariantDialog } from "./variant-dialog";

function formatCents(cents: number) {
  return (cents / 100).toFixed(2);
}

type VariantDialogState = { mode: "create" } | { mode: "edit"; variant: VariantAdmin };

// ─── Value row (inline rename / reorder / delete) ────────────────────────────

function ValueRow({
  value,
  isFirst,
  isLast,
  productId,
  siblings,
}: {
  value: OptionValue;
  isFirst: boolean;
  isLast: boolean;
  productId: string;
  siblings: OptionValue[];
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value.value);

  const saveMutation = useMutation({
    mutationFn: () => updateOptionValue(value.id, { value: text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product", productId] });
      setEditing(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to rename"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteOptionValue(value.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product", productId] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete value"),
  });

  const reorderMutation = useMutation({
    mutationFn: async (direction: "up" | "down") => {
      const sorted = [...siblings].sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = sorted.findIndex((v) => v.id === value.id);
      const swap = sorted[direction === "up" ? idx - 1 : idx + 1]!;
      await Promise.all([
        updateOptionValue(value.id, { sortOrder: swap.sortOrder }),
        updateOptionValue(swap.id, { sortOrder: value.sortOrder }),
      ]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product", productId] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to reorder"),
  });

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 py-1">
        <Input
          className="h-7 text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim()) saveMutation.mutate();
            if (e.key === "Escape") {
              setText(value.value);
              setEditing(false);
            }
          }}
        />
        <Button
          size="sm"
          className="h-7 px-2"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !text.trim()}
        >
          {saveMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : "Save"}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => {
            setText(value.value);
            setEditing(false);
          }}
        >
          <X className="size-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 py-1 group">
      <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" />
      <span className="text-sm flex-1">{value.value}</span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          className="size-6"
          disabled={isFirst || reorderMutation.isPending}
          onClick={() => reorderMutation.mutate("up")}
        >
          <ArrowUp className="size-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-6"
          disabled={isLast || reorderMutation.isPending}
          onClick={() => reorderMutation.mutate("down")}
        >
          <ArrowDown className="size-3" />
        </Button>
        <Button size="icon" variant="ghost" className="size-6" onClick={() => setEditing(true)}>
          <Pencil className="size-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-6 text-destructive hover:text-destructive"
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Trash2 className="size-3" />
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Option section (one option + its values) ────────────────────────────────

function OptionSection({
  option,
  productId,
  onEdit,
}: {
  option: ProductOption;
  productId: string;
  onEdit: (o: ProductOption) => void;
}) {
  const qc = useQueryClient();
  const [addingValue, setAddingValue] = useState(false);
  const [newValue, setNewValue] = useState("");
  const sorted = [...option.values].sort((a, b) => a.sortOrder - b.sortOrder);

  const deleteMutation = useMutation({
    mutationFn: () => deleteOption(option.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product", productId] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete option"),
  });

  const addValueMutation = useMutation({
    mutationFn: () =>
      createOptionValue(option.id, { value: newValue.trim(), sortOrder: option.values.length }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product", productId] });
      setNewValue("");
      setAddingValue(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to add value"),
  });

  return (
    <div className="py-2 first:pt-0">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-sm font-medium">{option.name}</span>
        <div className="flex items-center gap-0.5">
          <Button size="icon" variant="ghost" className="size-7" onClick={() => onEdit(option)}>
            <Pencil className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-destructive hover:text-destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
          </Button>
        </div>
      </div>
      <div className="ml-2">
        {sorted.length === 0 && !addingValue && (
          <p className="text-xs text-muted-foreground py-1">No values yet</p>
        )}
        {sorted.map((v, i) => (
          <ValueRow
            key={v.id}
            value={v}
            isFirst={i === 0}
            isLast={i === sorted.length - 1}
            productId={productId}
            siblings={option.values}
          />
        ))}
        {addingValue ? (
          <div className="flex items-center gap-1.5 pt-1">
            <Input
              className="h-7 text-sm"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="e.g. Red"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && newValue.trim()) addValueMutation.mutate();
                if (e.key === "Escape") {
                  setNewValue("");
                  setAddingValue(false);
                }
              }}
            />
            <Button
              size="sm"
              className="h-7 px-2"
              onClick={() => addValueMutation.mutate()}
              disabled={addValueMutation.isPending || !newValue.trim()}
            >
              {addValueMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : "Add"}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => {
                setNewValue("");
                setAddingValue(false);
              }}
            >
              <X className="size-3" />
            </Button>
          </div>
        ) : (
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-0.5 transition-colors"
            onClick={() => setAddingValue(true)}
          >
            <Plus className="size-3" /> Add value
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

type Props = {
  productId: string;
  variants: VariantAdmin[];
  options: ProductOption[];
};

export function VariantsCard({ productId, variants, options }: Props) {
  const qc = useQueryClient();
  const sortedOptions = [...options].sort((a, b) => a.sortOrder - b.sortOrder);

  const [variantDialog, setVariantDialog] = useState<{ open: boolean; state: VariantDialogState }>({
    open: false,
    state: { mode: "create" },
  });
  const [optionDialog, setOptionDialog] = useState<{ open: boolean; editing?: ProductOption }>({
    open: false,
  });

  const deleteVariantMutation = useMutation({
    mutationFn: (variantId: string) => deleteVariant(variantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product", productId] });
      toast.success("Variant removed");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to remove variant"),
  });

  const hasOptions = sortedOptions.length > 0;
  const hasVariants = variants.length > 0;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Variants</CardTitle>
          {(hasVariants || hasOptions) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setVariantDialog({ open: true, state: { mode: "create" } })}
            >
              <Plus className="size-4" /> Add Variant
            </Button>
          )}
        </CardHeader>

        <CardContent>
          {/* ── Empty state ── */}
          {!hasVariants && !hasOptions && (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
              <Package className="size-8 text-muted-foreground/30" />
              <p className="font-medium text-sm">No variants yet</p>
              <Button onClick={() => setVariantDialog({ open: true, state: { mode: "create" } })}>
                <Plus className="size-4" /> Add Variant
              </Button>
              <button
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
                onClick={() => setOptionDialog({ open: true })}
              >
                <Tag className="size-3" />
                Add options first if this product comes in sizes, colors, etc.
              </button>
            </div>
          )}

          {/* ── Options section ── */}
          {hasOptions && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Options
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setOptionDialog({ open: true })}
                >
                  <Plus className="size-3" /> Add option
                </Button>
              </div>
              <div className="divide-y">
                {sortedOptions.map((option) => (
                  <OptionSection
                    key={option.id}
                    option={option}
                    productId={productId}
                    onEdit={(o) => setOptionDialog({ open: true, editing: o })}
                  />
                ))}
              </div>
              <Separator className="mt-4 mb-4" />
            </div>
          )}

          {/* ── Variants table ── */}
          {hasVariants && (
            <div className="-mx-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16 pr-6" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="pl-6 font-medium">{v.name}</TableCell>
                      <TableCell className="text-muted-foreground">{v.sku ?? "—"}</TableCell>
                      <TableCell>${formatCents(v.priceCents)}</TableCell>
                      <TableCell>{v.stock - v.reserved}</TableCell>
                      <TableCell>
                        <span
                          className={
                            v.isActive
                              ? "text-green-600 dark:text-green-400"
                              : "text-muted-foreground"
                          }
                        >
                          {v.isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() =>
                              setVariantDialog({ open: true, state: { mode: "edit", variant: v } })
                            }
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => deleteVariantMutation.mutate(v.id)}
                            disabled={deleteVariantMutation.isPending}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* ── "Add options" hint when variants exist but none defined ── */}
          {hasVariants && !hasOptions && (
            <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-muted/50 text-muted-foreground">
              <Lightbulb className="size-3.5 mt-0.5 shrink-0" />
              <p className="text-xs">
                Does this product come in different sizes, colors, or styles?{" "}
                <button
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                  onClick={() => setOptionDialog({ open: true })}
                >
                  Add options
                </button>{" "}
                to organize your variants.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <VariantDialog
        open={variantDialog.open}
        onClose={() => setVariantDialog((s) => ({ ...s, open: false }))}
        state={variantDialog.state}
        productId={productId}
        options={options}
      />

      <OptionDialog
        open={optionDialog.open}
        onClose={() => setOptionDialog({ open: false })}
        productId={productId}
        editing={optionDialog.editing}
      />
    </>
  );
}
