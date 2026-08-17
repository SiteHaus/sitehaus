"use client";

import { duplicateNameIndexes, pluralize, rowCount, type Dimension } from "@/lib/combinations";
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
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { ValueInput } from "./value-input";

const MAX_DIMENSIONS = 3;
const ROW_LIMIT = 25;

type Props = {
  dimensions: Dimension[];
  onChange: (next: Dimension[]) => void;
};

type DimensionRowProps = {
  dimension: Dimension;
  /** This name repeats an earlier dimension's — the backend rejects that. */
  duplicateName: boolean;
  onNameChange: (name: string) => void;
  onAddValue: (value: string) => void;
  onRemoveValue: (value: string) => void;
  onRemove: () => void;
};

function DimensionRow({
  dimension,
  duplicateName,
  onNameChange,
  onAddValue,
  onRemoveValue,
  onRemove,
}: DimensionRowProps) {
  const trimmedName = dimension.name.trim();

  return (
    // Nested inside the card now, so it reads as a sub-block: muted fill, hairline
    // border. A full-strength border here competed with the card's own edge.
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input
          className={`h-8 text-sm flex-1 ${duplicateName ? "border-destructive" : ""}`}
          value={dimension.name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="What varies?"
          aria-invalid={duplicateName}
          // A freshly-added dimension (from the "sold in more than one…" checkbox
          // or "Also varies by…") starts unnamed — land the cursor here so the
          // seller can type straight away. React applies autoFocus on mount only,
          // so it never steals focus on later re-renders.
          autoFocus={!dimension.name}
        />
        <Button
          size="icon"
          variant="ghost"
          className="size-7 text-destructive hover:text-destructive"
          onClick={onRemove}
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {duplicateName ? (
        <p className="text-xs font-medium text-destructive">
          You&apos;ve already used this name — pick a different one.
        </p>
      ) : (
        trimmedName && (
          <p className="text-xs font-medium text-muted-foreground">{pluralize(trimmedName)}</p>
        )
      )}

      {dimension.values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {dimension.values.map((v) => (
            <Badge key={v} variant="outline" className="gap-1 pr-1">
              <span>{v}</span>
              <button
                type="button"
                onClick={() => onRemoveValue(v)}
                className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                aria-label={`Remove ${v}`}
              >
                <X className="size-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <ValueInput
        dimensionName={dimension.name}
        existing={dimension.values}
        onAdd={onAddValue}
        onRemoveLast={() => {
          const last = dimension.values.at(-1);
          if (last) onRemoveValue(last);
        }}
      />
    </div>
  );
}

export function DimensionEditor({ dimensions, onChange }: Props) {
  const [pending, setPending] = useState<{ next: Dimension[]; rows: number } | null>(null);
  // I4 — the sync endpoint rejects duplicate dimension names (case-insensitive).
  // Flag the offender inline; VariationsCard's Save is gated on the same rule
  // (via `saveHint`), so the seller can't fire an avoidable 400.
  const dupes = new Set(duplicateNameIndexes(dimensions));

  // Guarded: only additions (a new value or a new dimension) can push rowCount
  // past the threshold, so only those go through the confirm gate. Renames and
  // removals never increase rowCount and apply immediately.
  function applyGuarded(next: Dimension[]) {
    const rows = rowCount(next);
    if (rows > ROW_LIMIT) {
      setPending({ next, rows });
      return;
    }
    onChange(next);
  }

  function confirmPending() {
    if (!pending) return;
    onChange(pending.next);
    setPending(null);
  }

  function updateName(index: number, name: string) {
    onChange(dimensions.map((d, i) => (i === index ? { ...d, name } : d)));
  }

  function addValue(index: number, value: string) {
    applyGuarded(
      dimensions.map((d, i) => (i === index ? { ...d, values: [...d.values, value] } : d)),
    );
  }

  function removeValue(index: number, value: string) {
    onChange(
      dimensions.map((d, i) =>
        i === index ? { ...d, values: d.values.filter((v) => v !== value) } : d,
      ),
    );
  }

  function removeDimension(index: number) {
    onChange(dimensions.filter((_, i) => i !== index));
  }

  function addDimension() {
    if (dimensions.length >= MAX_DIMENSIONS) return;
    applyGuarded([...dimensions, { name: "", values: [] }]);
  }

  return (
    <div className="space-y-3">
      {dimensions.map((dimension, i) => (
        <DimensionRow
          key={i}
          dimension={dimension}
          duplicateName={dupes.has(i)}
          onNameChange={(name) => updateName(i, name)}
          onAddValue={(value) => addValue(i, value)}
          onRemoveValue={(value) => removeValue(i, value)}
          onRemove={() => removeDimension(i)}
        />
      ))}

      {dimensions.length < MAX_DIMENSIONS && (
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={addDimension}
        >
          <Plus className="size-3" />
          Also varies by…
        </button>
      )}

      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm change</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This creates {pending?.rows} rows — continue?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button onClick={confirmPending}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
