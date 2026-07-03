"use client";

import { getProduct, listProducts, type ProductDetail, type VariantAdmin } from "@/lib/commerce";
import { useStoreNav } from "@/lib/use-store-nav";
import { Button } from "@site-haus/ui/components/base/button";
import { Skeleton } from "@site-haus/ui/components/base/skeleton";
import { SectionCard } from "@/components/ui/section-card";
import { useQueries, useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";

const LOW_STOCK_THRESHOLD = 5;

type LowStockRow = {
  productId: string;
  productName: string;
  variant: VariantAdmin;
  available: number;
};

export function LowStockAlerts() {
  const { push } = useStoreNav();

  const { data: productList, isLoading: listLoading } = useQuery({
    queryKey: ["products-all"],
    queryFn: () => listProducts({ limit: 100 }),
  });

  const products = productList?.items ?? [];

  const detailQueries = useQueries({
    queries: products
      .filter((p) => p.variantCount > 0)
      .map((p) => ({
        queryKey: ["product", p.id],
        queryFn: () => getProduct(p.id),
      })),
  });

  const isLoading = listLoading || detailQueries.some((q) => q.isLoading);

  const lowStockRows: LowStockRow[] = detailQueries
    .flatMap((q) => {
      const detail = q.data as ProductDetail | undefined;
      if (!detail) return [];
      return detail.variants.map((v) => ({
        productId: detail.id,
        productName: detail.name,
        variant: v,
        available: v.stock - v.reserved,
      }));
    })
    .filter((r) => r.available <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.available - b.available)
    .slice(0, 5);

  return (
    <SectionCard
      title="Low stock"
      actions={
        <Button variant="ghost" size="sm" onClick={() => push("/inventory")}>
          View all
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : lowStockRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
          <CheckCircle2 className="size-5 text-green-500 opacity-70" />
          <p className="text-sm">All stocked up</p>
        </div>
      ) : (
        <div className="divide-y -mx-6 -mb-6">
          {lowStockRows.map((row) => (
            <button
              key={row.variant.id}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
              onClick={() => push(`/products/${row.productId}`)}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{row.productName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {row.variant.name}
                  {row.variant.sku ? ` · ${row.variant.sku}` : ""}
                </p>
              </div>
              <span
                className={`ml-3 shrink-0 text-sm font-semibold tabular-nums ${
                  row.available <= 0 ? "text-destructive" : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {row.available <= 0 ? "Out" : row.available}
              </span>
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
