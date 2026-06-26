"use client";

import {
  createOptionValue,
  deleteOption,
  deleteOptionValue,
  updateOptionValue,
  type OptionValue,
  type ProductOption,
} from "@/lib/commerce";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@site-haus/ui/components/base/badge";
import { Button } from "@site-haus/ui/components/base/button";
import { Input } from "@site-haus/ui/components/base/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { OptionDialog } from "./option-dialog";

type Props = {
  productId: string;
  options: ProductOption[];
};

type ValueRowProps = {
  value: OptionValue;
  isFirst: boolean;
  isLast: boolean;
  productId: string;
  optionId: string;
  siblings: OptionValue[];
};

function ValueRow({ value, isFirst, isLast, productId, optionId, siblings }: ValueRowProps) {
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
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      const swapTarget = sorted[swapIdx]!;
      await Promise.all([
        updateOptionValue(value.id, { sortOrder: swapTarget.sortOrder }),
        updateOptionValue(swapTarget.id, { sortOrder: value.sortOrder }),
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
      <ChevronRight className="size-3 text-muted-foreground/50 shrink-0" />
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

type OptionSectionProps = {
  option: ProductOption;
  productId: string;
  onEdit: (option: ProductOption) => void;
};

function OptionSection({ option, productId, onEdit }: OptionSectionProps) {
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
      createOptionValue(option.id, {
        value: newValue.trim(),
        sortOrder: option.values.length,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product", productId] });
      setNewValue("");
      setAddingValue(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to add value"),
  });

  return (
    <div className="py-3 first:pt-0">
      <div className="flex items-center justify-between mb-1">
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
            optionId={option.id}
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
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1 transition-colors"
            onClick={() => setAddingValue(true)}
          >
            <Plus className="size-3" />
            Add value
          </button>
        )}
      </div>
    </div>
  );
}

export function OptionsCard({ productId, options }: Props) {
  const sorted = [...options].sort((a, b) => a.sortOrder - b.sortOrder);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<ProductOption | undefined>();

  function openCreate() {
    setEditingOption(undefined);
    setDialogOpen(true);
  }

  function openEdit(option: ProductOption) {
    setEditingOption(option);
    setDialogOpen(true);
  }

  return (
    <>
      <SectionCard
        className="mb-6"
        title="Options"
        actions={
          <Button size="sm" variant="outline" onClick={openCreate}>
            <Plus className="size-4" />
            Add Option
          </Button>
        }
      >
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center gap-2 text-muted-foreground">
            <Layers className="size-6 opacity-30" />
            <p className="text-sm">
              No options yet — add one to start building variants like Color or Size.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {sorted.map((option) => (
              <OptionSection
                key={option.id}
                option={option}
                productId={productId}
                onEdit={openEdit}
              />
            ))}
          </div>
        )}
      </SectionCard>

      <OptionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        productId={productId}
        editing={editingOption}
      />
    </>
  );
}
