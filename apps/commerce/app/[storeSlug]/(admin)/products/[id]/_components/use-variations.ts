"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { syncVariations, type ProductDetail, type SyncVariationsBody } from "@/lib/commerce";
import {
  completeDimensions,
  generateCombinations,
  saveHint,
  type Dimension,
} from "@/lib/combinations";

export type EditableRow = {
  key: string;
  values: string[];
  priceCents: number;
  stock: number;
  sku: string;
  isActive: boolean;
};
const keyOf = (values: string[]) => JSON.stringify(values);

type Seed = { dimensions: Dimension[]; rows: EditableRow[]; removedKeys: string[] };

function seed(product: ProductDetail): Seed {
  const options = [...product.options].sort((a, b) => a.sortOrder - b.sortOrder);
  const dimensions: Dimension[] = options.map((o) => ({
    name: o.name,
    values: [...o.values].sort((a, b) => a.sortOrder - b.sortOrder).map((v) => v.value),
  }));

  const valuesOf = (v: ProductDetail["variants"][number]) =>
    options
      .map((o) => v.optionValues.find((ov) => ov.optionId === o.id)?.value ?? "")
      .filter((x) => x !== "");

  // I7(a) — on a product WITH dimensions, an inactive variant is a combination
  // the seller already deleted: the backend refused to drop it because it
  // appears in orders, so it flipped it inactive instead (and said so via the
  // `blocked` toast). It isn't sellable, so we keep it OUT of the editable
  // table — bringing it back as an ordinary row would look like the delete
  // silently failed. Its key is remembered as "removed" so a later dimension
  // edit doesn't regenerate it either. Accepted consequence: each save
  // re-attempts the removal and the backend re-blocks it, so that warning
  // repeats — truthful and idempotent.
  //
  // A PLAIN product is different: its lone variant carries the product's price
  // and stock, and "inactive" there just means the product is switched off, not
  // deleted. Keep it, or the pricing fields would blank out.
  //
  // N1 — but "the plain product's variant" must be a LIVE one whenever a live one
  // exists. A product that collapsed from dimensions to plain can be left with a
  // retired tombstone (deactivated because it had orders) sitting alongside the
  // real plain variant. Surfacing the tombstone as the pricing row would show dead
  // price/stock AND push its `isActive: false` onto the live variant on the next
  // save, making the product unbuyable. Prefer an active variant; fall back to an
  // inactive one only when that's genuinely all there is (a switched-off product).
  const isPlain = options.length === 0;
  const activeVariants = product.variants.filter((v) => v.isActive);
  const plainVariant = activeVariants[0] ?? product.variants[0];
  const editable = isPlain ? (plainVariant ? [plainVariant] : []) : activeVariants;
  const rows: EditableRow[] = editable.map((v) => {
    const values = valuesOf(v);
    return {
      key: keyOf(values),
      values,
      priceCents: v.priceCents,
      stock: v.stock,
      sku: v.sku ?? "",
      isActive: v.isActive,
    };
  });
  const removedKeys = isPlain
    ? []
    : product.variants
        .filter((v) => !v.isActive)
        .map((v) => keyOf(valuesOf(v)))
        .filter((k) => !rows.some((r) => r.key === k));

  // A brand-new product has no variants yet. Seed a single plain row (matching
  // what `regenerate([])` would produce) so the pricing fields always have
  // something to render/save instead of going blank.
  if (rows.length === 0 && dimensions.length === 0) {
    rows.push({ key: keyOf([]), values: [], priceCents: 0, stock: 0, sku: "", isActive: true });
  }
  return { dimensions, rows, removedKeys };
}

const mapOf = (rows: EditableRow[]) => Object.fromEntries(rows.map((r) => [r.key, r]));

export function useVariations(product: ProductDetail) {
  const qc = useQueryClient();
  const [initial] = useState<Seed>(() => seed(product));
  const [dimensions, setDims] = useState<Dimension[]>(initial.dimensions);
  const [rowMap, setRowMap] = useState<Record<string, EditableRow>>(mapOf(initial.rows));
  // I5 — combinations the seller deleted. Kept out of `regenerate()` so they
  // don't resurrect the moment a dimension is touched.
  const [removedKeys, setRemovedKeys] = useState<Set<string>>(new Set(initial.removedKeys));
  const [dirty, setDirty] = useState(false);

  // I7(b) — `product` is refetched (e.g. after InventoryCard saves stock and
  // invalidates ["product", id]). Re-seed from the fresh data, but only when the
  // seller has nothing unsaved, so we never clobber in-progress edits. The ref
  // is deliberately not updated while dirty: once the edits are saved (dirty
  // flips false) this runs and picks up whatever the latest product is.
  const seededFrom = useRef(product);
  useEffect(() => {
    if (dirty || seededFrom.current === product) return;
    seededFrom.current = product;
    const s = seed(product);
    setDims(s.dimensions);
    setRowMap(mapOf(s.rows));
    setRemovedKeys(new Set(s.removedKeys));
  }, [product, dirty]);

  /**
   * I5 semantics: a deletion is remembered only for as long as the combination
   * is still producible from the current dimensions. Drop the value it depends
   * on and the memory of the deletion goes with it — so re-adding that value
   * later brings the row back fresh (default price, 0 stock) rather than
   * silently staying hidden.
   */
  function regenerate(next: Dimension[]) {
    const combos = next.length ? generateCombinations(next) : [[]];
    const prev = rowMap;
    const defaults = Object.values(prev)[0];
    const nextMap: Record<string, EditableRow> = {};
    const nextRemoved = new Set<string>();
    for (const values of combos) {
      const key = keyOf(values);
      if (removedKeys.has(key)) {
        nextRemoved.add(key);
        continue;
      }
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
    setRemovedKeys(nextRemoved);
    setDims(next);
    setDirty(true);
  }

  const hint = saveHint(dimensions);

  const mutation = useMutation({
    mutationFn: () => {
      // I2 — the backend does NOT skip dimensions with no values (our
      // `generateCombinations` does), so an incomplete dimension would make its
      // set of valid keys empty and every row would be rejected. Send only the
      // dimensions it will accept. The Save button is gated on the same rule, so
      // this is belt-and-braces.
      const body: SyncVariationsBody = {
        dimensions: completeDimensions(dimensions),
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

  const rows = Object.values(rowMap);

  return {
    hasVariations: dimensions.length > 0,
    dimensions,
    rows,
    // I6 — the counter shows what's actually in the table, deletions included.
    // (The >25 confirm gate in DimensionEditor keeps using `rowCount()`: that's
    // about what an action *would* create, which is a different question.)
    count: rows.length,
    dirty,
    isSaving: mutation.isPending,
    /** I1 — plain-language reason Save is blocked, or null when it's fine. */
    saveHint: hint,
    canSave: dirty && !hint && !mutation.isPending,
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
      setRemovedKeys((s) => new Set(s).add(key));
      setDirty(true);
    },
    enable: (firstName: string) => regenerate([{ name: firstName, values: [] }]),
    // M1 — collapsing back to a plain product keeps the first row's price,
    // stock AND sku (regenerate() only carries price forward, since brand-new
    // combinations should start at 0 stock with no sku).
    disableToPlain: () => {
      const first = Object.values(rowMap)[0];
      const key = keyOf([]);
      setRowMap({
        [key]: {
          key,
          values: [],
          priceCents: first?.priceCents ?? 0,
          stock: first?.stock ?? 0,
          sku: first?.sku ?? "",
          isActive: true,
        },
      });
      setRemovedKeys(new Set());
      setDims([]);
      setDirty(true);
    },
    save: () => mutation.mutate(),
  };
}
