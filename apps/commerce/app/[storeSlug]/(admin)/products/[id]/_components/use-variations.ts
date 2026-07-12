"use client";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { syncVariations, type ProductDetail, type SyncVariationsBody } from "@/lib/commerce";
import { generateCombinations, rowCount, type Dimension } from "@/lib/combinations";

export type EditableRow = {
  key: string;
  values: string[];
  priceCents: number;
  stock: number;
  sku: string;
  isActive: boolean;
};
const keyOf = (values: string[]) => JSON.stringify(values);

function seed(product: ProductDetail): { dimensions: Dimension[]; rows: EditableRow[] } {
  const options = [...product.options].sort((a, b) => a.sortOrder - b.sortOrder);
  const dimensions: Dimension[] = options.map((o) => ({
    name: o.name,
    values: [...o.values].sort((a, b) => a.sortOrder - b.sortOrder).map((v) => v.value),
  }));
  const rows: EditableRow[] = product.variants.map((v) => {
    const values = options
      .map((o) => v.optionValues.find((ov) => ov.optionId === o.id)?.value ?? "")
      .filter((x) => x !== "");
    return {
      key: keyOf(values),
      values,
      priceCents: v.priceCents,
      stock: v.stock,
      sku: v.sku ?? "",
      isActive: v.isActive,
    };
  });
  return { dimensions, rows };
}

export function useVariations(product: ProductDetail) {
  const qc = useQueryClient();
  const initial = useMemo(() => seed(product), [product]);
  const [dimensions, setDims] = useState<Dimension[]>(initial.dimensions);
  const [rowMap, setRowMap] = useState<Record<string, EditableRow>>(
    Object.fromEntries(initial.rows.map((r) => [r.key, r])),
  );
  const [dirty, setDirty] = useState(false);

  function regenerate(next: Dimension[]) {
    const combos = next.length ? generateCombinations(next) : [[]];
    const prev = rowMap;
    const defaults = Object.values(prev)[0];
    const nextMap: Record<string, EditableRow> = {};
    for (const values of combos) {
      const key = keyOf(values);
      nextMap[key] = prev[key] ?? {
        key,
        values,
        priceCents: defaults?.priceCents ?? 0,
        stock: 0,
        sku: "",
        isActive: true,
      };
    }
    setRowMap(nextMap);
    setDims(next);
    setDirty(true);
  }

  const mutation = useMutation({
    mutationFn: () => {
      const body: SyncVariationsBody = {
        dimensions,
        rows: Object.values(rowMap).map((r) => ({
          values: r.values,
          priceCents: r.priceCents,
          stock: r.stock,
          sku: r.sku || null,
          isActive: r.isActive,
        })),
      };
      return syncVariations(product.id, body);
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["product", product.id] });
      setDirty(false);
      if (res.blocked.length) {
        toast.warning(
          `Couldn't remove ${res.blocked.map((b) => b.name).join(", ")} — used in orders. Turned inactive instead.`,
        );
      } else {
        toast.success("Saved");
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  return {
    hasVariations: dimensions.length > 0,
    dimensions,
    rows: Object.values(rowMap),
    count: rowCount(dimensions),
    dirty,
    isSaving: mutation.isPending,
    setDimensions: regenerate,
    setRow: (key: string, patch: Partial<EditableRow>) => {
      setRowMap((m) => ({ ...m, [key]: { ...m[key], ...patch } as EditableRow }));
      setDirty(true);
    },
    removeRow: (key: string) => {
      setRowMap((m) => {
        const n = { ...m };
        delete n[key];
        return n;
      });
      setDirty(true);
    },
    enable: (firstName: string) => regenerate([{ name: firstName, values: [] }]),
    disableToPlain: () => regenerate([]),
    save: () => mutation.mutate(),
  };
}
