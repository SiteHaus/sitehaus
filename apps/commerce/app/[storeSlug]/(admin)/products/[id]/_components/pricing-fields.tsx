"use client";

import { SectionCard } from "@/components/ui/section-card";
import { formatCents, formatOptionalCents, parseDollars, parseOptionalDollars } from "@/lib/money";
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
          <Label>Price ($)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={formatCents(row.priceCents)}
            onChange={(e) => onChange({ priceCents: parseDollars(e.target.value) || 0 })}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label>
            Compare at ($)
            <span className="ml-1 font-normal text-muted-foreground">optional</span>
          </Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={formatOptionalCents(row.compareAtCents)}
            onChange={(e) => onChange({ compareAtCents: parseOptionalDollars(e.target.value) })}
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
    </SectionCard>
  );
}
