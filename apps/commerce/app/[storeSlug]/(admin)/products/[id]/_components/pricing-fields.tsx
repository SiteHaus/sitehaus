"use client";

import { SectionCard } from "@/components/ui/section-card";
import { Input } from "@site-haus/ui/components/base/input";
import { Label } from "@site-haus/ui/components/base/label";
import type { EditableRow } from "./use-variations";

function formatCents(cents: number) {
  return (cents / 100).toFixed(2);
}

function parseDollars(val: string) {
  return Math.round(parseFloat(val) * 100);
}

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
      </div>

      <div className="space-y-2 mt-3">
        <Label>SKU</Label>
        <Input
          value={row.sku}
          onChange={(e) => onChange({ sku: e.target.value })}
          placeholder="Optional"
        />
      </div>
    </SectionCard>
  );
}
