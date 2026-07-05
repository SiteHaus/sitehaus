"use client";

import { listInventory, type BulkInventoryItem } from "@/lib/commerce";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { Button } from "@site-haus/ui/components/base/button";
import { TableCell } from "@site-haus/ui/components/base/table";
import { Tabs, TabsList, TabsTrigger } from "@site-haus/ui/components/base/tabs";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Warehouse } from "lucide-react";
import { useState } from "react";
import { AdjustInventoryDialog, StockBadge } from "./_components/adjust-inventory-dialog";

type StockFilter = "all" | "low" | "out";

const PAGE_SIZE = 50;

const FILTER_TABS: { label: string; value: StockFilter }[] = [
  { label: "All", value: "all" },
  { label: "Low Stock", value: "low" },
  { label: "Out of Stock", value: "out" },
];

export default function InventoryPage() {
  const [filter, setFilter] = useState<StockFilter>("all");
  const [page, setPage] = useState(0);
  const [adjusting, setAdjusting] = useState<BulkInventoryItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", "list", filter, page],
    queryFn: () =>
      listInventory({ limit: PAGE_SIZE, offset: page * PAGE_SIZE, stockFilter: filter }),
    staleTime: 30_000,
  });

  const { data: lowData } = useQuery({
    queryKey: ["inventory", "count", "low"],
    queryFn: () => listInventory({ limit: 1, stockFilter: "low" }),
    staleTime: 30_000,
  });

  const { data: outData } = useQuery({
    queryKey: ["inventory", "count", "out"],
    queryFn: () => listInventory({ limit: 1, stockFilter: "out" }),
    staleTime: 30_000,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const lowCount = lowData?.total ?? 0;
  const outCount = outData?.total ?? 0;

  function handleFilterChange(value: StockFilter) {
    setFilter(value);
    setPage(0);
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle={isLoading ? "—" : `${total} variant${total !== 1 ? "s" : ""}`}
      />

      <Tabs
        value={filter}
        onValueChange={(v) => handleFilterChange(v as StockFilter)}
        className="mb-4"
      >
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

      <DataTableShell
        columns={[
          { header: "Product" },
          { header: "Variant" },
          { header: "SKU" },
          { header: "Stock", className: "text-right" },
          { header: "Reserved", className: "text-right" },
          { header: "Available", className: "text-right" },
          { header: "", className: "w-12" },
        ]}
        rows={items}
        getRowKey={(row) => row.variantId}
        isLoading={isLoading}
        empty={{
          icon: Warehouse,
          title:
            filter === "all"
              ? "No inventory tracked"
              : `No ${filter === "low" ? "low stock" : "out of stock"} items`,
          description: filter !== "all" ? "All variants are well stocked." : undefined,
        }}
        page={page + 1}
        totalPages={pageCount}
        onPageChange={(p) => setPage(p - 1)}
        renderRow={(row) => {
          const idx = items.findIndex((r) => r === row);
          const showProduct = idx === 0 || items[idx - 1]?.productId !== row.productId;
          const isLowStock = row.available <= 5;
          return (
            <>
              <TableCell className="font-medium">{showProduct ? row.productName : ""}</TableCell>
              <TableCell>{row.variantName}</TableCell>
              <TableCell className="text-muted-foreground">{row.sku ?? "—"}</TableCell>
              <TableCell className="text-right">{row.stock}</TableCell>
              <TableCell className="text-right text-muted-foreground">{row.reserved}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <StockBadge available={row.available} />
                  <span className={isLowStock ? "text-primary font-medium" : undefined}>
                    {row.available}
                  </span>
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
            </>
          );
        }}
      />

      {adjusting && (
        <AdjustInventoryDialog
          item={adjusting}
          open={!!adjusting}
          onClose={() => setAdjusting(null)}
        />
      )}
    </div>
  );
}
