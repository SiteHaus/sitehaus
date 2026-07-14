"use client";

import { useState } from "react";
import type { ProductDetail } from "@/lib/commerce";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@site-haus/ui/components/base/button";
import { Checkbox } from "@site-haus/ui/components/base/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@site-haus/ui/components/base/dialog";
import { Loader2 } from "lucide-react";
import { CombinationsTable } from "./combinations-table";
import { DimensionEditor } from "./dimension-editor";
import { PricingFields } from "./pricing-fields";
import { useVariations } from "./use-variations";

type Props = {
  product: ProductDetail;
};

export function VariationsCard({ product }: Props) {
  const {
    hasVariations,
    dimensions,
    rows,
    count,
    dirty,
    isSaving,
    canSave,
    saveHint,
    setDimensions,
    setRow,
    removeRow,
    enable,
    disableToPlain,
    save,
  } = useVariations(product);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const plainRow = rows[0];

  function handleCheckedChange(checked: boolean) {
    if (checked) {
      enable("");
    } else {
      setConfirmOpen(true);
    }
  }

  function confirmDisable() {
    disableToPlain();
    setConfirmOpen(false);
  }

  return (
    <div className="space-y-6">
      {/* The toggle and the things-that-vary live in ONE card. Giving the toggle its own
          card left a header with nothing in it but the Save button — a band of dead space
          — and the dimension editor floated on the page background, matching no other
          card on this screen. */}
      <SectionCard>
        <div className="flex items-start gap-2">
          <Checkbox
            id="has-variations"
            checked={hasVariations}
            onCheckedChange={(v) => handleCheckedChange(!!v)}
          />
          <label htmlFor="has-variations" className="text-sm cursor-pointer leading-snug">
            Sold in more than one size, color, or style
          </label>
        </div>

        {hasVariations && (
          <div className="mt-4 border-t pt-4">
            <DimensionEditor dimensions={dimensions} onChange={setDimensions} />
          </div>
        )}
      </SectionCard>

      {!hasVariations && plainRow && (
        <PricingFields row={plainRow} onChange={(patch) => setRow(plainRow.key, patch)} />
      )}

      {hasVariations && (
        <CombinationsTable
          rows={rows}
          dimensions={dimensions}
          setRow={setRow}
          removeRow={removeRow}
          count={count}
        />
      )}

      {/* Save sits AFTER everything it saves (dimensions + the grid), and only once
          there's something to save — the same convention the Details card uses. */}
      {dirty && (
        <div className="flex items-center justify-end gap-3">
          {/* I1 — say what's missing rather than letting Save fire a 400. */}
          {saveHint && <span className="text-xs text-muted-foreground">{saveHint}</span>}
          <Button onClick={() => save()} disabled={!canSave}>
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Switch back to one price?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This clears the sizes, colors, or styles you&apos;ve set up and returns to a single
            price and stock count.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmDisable}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
