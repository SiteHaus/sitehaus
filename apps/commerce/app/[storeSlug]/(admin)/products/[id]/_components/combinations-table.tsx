"use client";

import type { Dimension } from "@/lib/combinations";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@site-haus/ui/components/base/button";
import { Input } from "@site-haus/ui/components/base/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@site-haus/ui/components/base/table";
import { Trash2 } from "lucide-react";
import type { EditableRow } from "./use-variations";

function formatCents(cents: number) {
  return (cents / 100).toFixed(2);
}

function parseDollars(val: string) {
  return Math.round(parseFloat(val) * 100);
}

type Props = {
  rows: EditableRow[];
  dimensions: Dimension[];
  setRow: (key: string, patch: Partial<EditableRow>) => void;
  removeRow: (key: string) => void;
  count: number;
};

export function CombinationsTable({ rows, dimensions, setRow, removeRow, count }: Props) {
  return (
    <SectionCard
      title="Pricing & stock"
      actions={
        <span className="text-xs text-muted-foreground">
          {count} {count === 1 ? "row" : "rows"}
        </span>
      }
    >
      <div className="-mx-6 -mb-6">
        <Table>
          <TableHeader>
            <TableRow>
              {dimensions.map((dimension, i) => (
                <TableHead key={i} className={i === 0 ? "pl-6" : undefined}>
                  {dimension.name || "—"}
                </TableHead>
              ))}
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="w-12 pr-6" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key}>
                {dimensions.map((_, i) => (
                  <TableCell key={i} className={i === 0 ? "pl-6 font-medium" : undefined}>
                    {row.values[i]}
                  </TableCell>
                ))}
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-8 w-24"
                    value={formatCents(row.priceCents)}
                    onChange={(e) =>
                      setRow(row.key, { priceCents: parseDollars(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    className="h-8 w-20"
                    value={row.stock}
                    onChange={(e) => setRow(row.key, { stock: parseInt(e.target.value, 10) || 0 })}
                    placeholder="0"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    className="h-8 w-32"
                    value={row.sku}
                    onChange={(e) => setRow(row.key, { sku: e.target.value })}
                    placeholder="Optional"
                  />
                </TableCell>
                <TableCell className="pr-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => removeRow(row.key)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  );
}
