"use client";

import { type BulkInventoryItem, type VariantAdmin } from "@/lib/commerce";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@site-haus/ui/components/base/table";
import { Pencil } from "lucide-react";
import { useState } from "react";
import {
  AdjustInventoryDialog,
  StockBadge,
} from "../../../inventory/_components/adjust-inventory-dialog";

export function InventoryCard({
  productId,
  productName,
  variants,
}: {
  productId: string;
  productName: string;
  variants: VariantAdmin[];
}) {
  const [adjusting, setAdjusting] = useState<BulkInventoryItem | null>(null);

  if (variants.length === 0) return null;

  function toInventoryItem(v: VariantAdmin): BulkInventoryItem {
    const available = v.stock - v.reserved;
    return {
      variantId: v.id,
      productId,
      productName,
      variantName: v.name,
      sku: v.sku,
      stock: v.stock,
      reserved: v.reserved,
      available,
      allowBackorder: v.allowBackorder,
    };
  }

  return (
    <>
      <SectionCard title="Inventory">
        <div className="-mx-6 -mb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Item</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="w-16 pr-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((v) => {
                const available = v.stock - v.reserved;
                return (
                  <TableRow key={v.id}>
                    <TableCell className="pl-6 font-medium">{v.name}</TableCell>
                    <TableCell className="text-right">{v.stock}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{v.reserved}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <StockBadge available={available} />
                        <span>{available}</span>
                      </div>
                    </TableCell>
                    <TableCell className="pr-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setAdjusting(toInventoryItem(v))}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      {adjusting && (
        <AdjustInventoryDialog
          item={adjusting}
          open={!!adjusting}
          onClose={() => setAdjusting(null)}
        />
      )}
    </>
  );
}
