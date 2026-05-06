"use client";

import { listInventory, type BulkInventoryItem } from "@/lib/commerce";
import { Button } from "@site-haus/ui/components/base/button";
import { Skeleton } from "@site-haus/ui/components/base/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@site-haus/ui/components/base/table";
import { Tabs, TabsList, TabsTrigger } from "@site-haus/ui/components/base/tabs";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Warehouse } from "lucide-react";
import { useState } from "react";
import { AdjustInventoryDialog, StockBadge } from "./_components/adjust-inventory-dialog";

type StockFilter = "all" | "low" | "out";

const FILTER_TABS: { label: string; value: StockFilter }[] = [
  { label: "All", value: "all" },
  { label: "Low Stock", value: "low" },
  { label: "Out of Stock", value: "out" },
];

function matchesFilter(available: number, filter: StockFilter) {
  if (filter === "low") return available > 0 && available <= 5;
  if (filter === "out") return available <= 0;
  return true;
}

export default function InventoryPage() {
  const [filter, setFilter] = useState<StockFilter>("all");
  const [adjusting, setAdjusting] = useState<BulkInventoryItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", "list"],
    queryFn: () => listInventory({ limit: 500 }),
    staleTime: 30_000,
  });

  const items = data?.items ?? [];
  const filtered = items.filter((r) => matchesFilter(r.available, filter));

  const lowCount = items.filter((r) => r.available > 0 && r.available <= 5).length;
  const outCount = items.filter((r) => r.available <= 0).length;

  const productCount = new Set(items.map((r) => r.productId)).size;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isLoading
              ? "—"
              : `${items.length} variant${items.length !== 1 ? "s" : ""} across ${productCount} product${productCount !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as StockFilter)} className="mb-4">
        <TabsList>
          {FILTER_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
              {t.value === "low" && lowCount > 0 && (
                <span className="ml-1.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 text-xs px-1.5 py-0.5 font-medium">
                  {lowCount}
                </span>
              )}
              {t.value === "out" && outCount > 0 && (
                <span className="ml-1.5 rounded-full bg-destructive/10 text-destructive text-xs px-1.5 py-0.5 font-medium">
                  {outCount}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-10 ml-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-10 ml-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-10 ml-auto" />
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Warehouse className="size-10 mb-3 opacity-30" />
                    <p className="font-medium">
                      {filter === "all"
                        ? "No variants found"
                        : `No ${filter === "low" ? "low stock" : "out of stock"} items`}
                    </p>
                    {filter !== "all" && (
                      <p className="text-sm mt-1">All variants are well stocked.</p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row, i) => {
                const showProduct = i === 0 || filtered[i - 1]?.productId !== row.productId;
                return (
                  <TableRow key={row.variantId}>
                    <TableCell className="font-medium">
                      {showProduct ? row.productName : ""}
                    </TableCell>
                    <TableCell>{row.variantName}</TableCell>
                    <TableCell className="text-muted-foreground">{row.sku ?? "—"}</TableCell>
                    <TableCell className="text-right">{row.stock}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {row.reserved}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <StockBadge available={row.available} />
                        <span>{row.available}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setAdjusting(row)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {adjusting && (
        <AdjustInventoryDialog
          variantId={adjusting.variantId}
          variantName={adjusting.variantName}
          open={!!adjusting}
          onClose={() => setAdjusting(null)}
        />
      )}
    </div>
  );
}
