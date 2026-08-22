"use client";

import { MoneyInput } from "@/components/ui/money-input";
import { SectionCard } from "@/components/ui/section-card";
import { Input } from "@site-haus/ui/components/base/input";
import { Label } from "@site-haus/ui/components/base/label";
import type { EditableRow } from "./use-variations";

type Props = {
  row: EditableRow;
  onChange: (patch: Partial<EditableRow>) => void;
};

export function PricingFields({ row, onChange }: Props) {
  return (
    <SectionCard title="Pricing & stock">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Price</Label>
          <MoneyInput
            className="h-9"
            aria-label="Price"
            cents={row.priceCents}
            onChange={(cents) => onChange({ priceCents: cents ?? 0 })}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label>
            Compare at
            <span className="ml-1 font-normal text-muted-foreground">optional</span>
          </Label>
          <MoneyInput
            className="h-9"
            aria-label="Compare at price"
            nullable
            cents={row.compareAtCents}
            onChange={(cents) => onChange({ compareAtCents: cents })}
            placeholder="—"
          />
          <p className="text-xs text-muted-foreground">
            The old price, shown struck through. Leave empty if it&apos;s not on sale.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="space-y-2">
          <Label>In stock</Label>
          <Input
            type="number"
            min="0"
            step="1"
            value={row.stock}
            onChange={(e) => onChange({ stock: parseInt(e.target.value, 10) || 0 })}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label>SKU</Label>
          <Input
            value={row.sku}
            onChange={(e) => onChange({ sku: e.target.value })}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="space-y-2">
          <Label>
            Weight (grams)
            <span className="ml-1 font-normal text-muted-foreground">optional</span>
          </Label>
          <Input
            type="number"
            min="0"
            step="1"
            value={row.weightGrams ?? ""}
            onChange={(e) =>
              onChange({ weightGrams: e.target.value ? parseInt(e.target.value, 10) : null })
            }
            placeholder="—"
          />
        </div>
      </div>
    </SectionCard>
  );
}
