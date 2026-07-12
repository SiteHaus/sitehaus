"use client";

import { pluralize, rowCount, type Dimension } from "@/lib/combinations";
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

const MAX_DIMENSIONS = 3;
const ROW_LIMIT = 25;

type Props = {
  dimensions: Dimension[];
  onChange: (next: Dimension[]) => void;
};

type DimensionRowProps = {
  dimension: Dimension;
  onNameChange: (name: string) => void;
  onAddValue: (value: string) => void;
  onRemoveValue: (value: string) => void;
  onRemove: () => void;
};

function DimensionRow({
  dimension,
  onNameChange,
  onAddValue,
  onRemoveValue,
  onRemove,
}: DimensionRowProps) {
  const [adding, setAdding] = useState(false);
  const [newValue, setNewValue] = useState("");

  const trimmedName = dimension.name.trim();
  const singular = (trimmedName || "value").toLowerCase();
  const trimmedNewValue = newValue.trim();
  const isDuplicate = dimension.values.some(
    (v) => v.toLowerCase() === trimmedNewValue.toLowerCase(),
  );
  const canAdd = trimmedNewValue.length > 0 && !isDuplicate;

  function commitAdd() {
    if (!canAdd) return;
    onAddValue(trimmedNewValue);
    setNewValue("");
    setAdding(false);
  }

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input
          className="h-8 text-sm flex-1"
          value={dimension.name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="What varies?"
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

      {trimmedName && (
        <p className="text-xs font-medium text-muted-foreground">{pluralize(trimmedName)}</p>
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

      {adding ? (
        <div className="flex items-center gap-1.5">
          <Input
            className="h-7 text-sm"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={`e.g. ${trimmedName ? "" : "Red"}`}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") commitAdd();
              if (e.key === "Escape") {
                setNewValue("");
                setAdding(false);
              }
            }}
          />
          <Button size="sm" className="h-7 px-2" onClick={commitAdd} disabled={!canAdd}>
            Add
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => {
              setNewValue("");
              setAdding(false);
            }}
          >
            <X className="size-3" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setAdding(true)}
        >
          <Plus className="size-3" />
          add a {singular}
        </button>
      )}
    </div>
  );
}

export function DimensionEditor({ dimensions, onChange }: Props) {
  const [pending, setPending] = useState<{ next: Dimension[]; rows: number } | null>(null);

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
