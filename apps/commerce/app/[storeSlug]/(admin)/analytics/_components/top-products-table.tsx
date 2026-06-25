"use client";

import { getAnalyticsTopProducts } from "@/lib/commerce";
import { useStoreNav } from "@/lib/use-store-nav";
import { SectionCard } from "@/components/ui/section-card";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { TableCell } from "@site-haus/ui/components/base/table";
import { Tabs, TabsList, TabsTrigger } from "@site-haus/ui/components/base/tabs";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { useState } from "react";
import { type PeriodOption, periodToParams } from "../../_components/period-utils";

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function TopProductsTable({ period }: { period: PeriodOption }) {
  const { from, to } = periodToParams(period);
  const { push } = useStoreNav();
  const [tab, setTab] = useState<"revenue" | "views">("revenue");

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-top-products", period],
    queryFn: () => getAnalyticsTopProducts(from, to, 50),
    staleTime: 30_000,
  });

  const totalRevenue = data?.byRevenue.reduce((sum, p) => sum + p.revenue, 0) ?? 0;

  const revenueRows = (data?.byRevenue ?? []).map((p, i) => ({ ...p, rank: i + 1 }));
  const viewsRows = (data?.byViews ?? []).map((p, i) => ({ ...p, rank: i + 1 }));

  const tabControl = (
    <Tabs value={tab} onValueChange={(v) => setTab(v as "revenue" | "views")}>
      <TabsList className="h-7">
        <TabsTrigger value="revenue" className="text-xs px-3">
          By Revenue
        </TabsTrigger>
        <TabsTrigger value="views" className="text-xs px-3">
          By Views
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );

  return (
    <SectionCard title="Top Products" actions={tabControl}>
      {tab === "revenue" ? (
        <DataTableShell
          columns={[
            { header: "#", className: "w-10" },
            { header: "Product" },
            { header: "Revenue", className: "text-right" },
            { header: "% of Total", className: "text-right" },
          ]}
          rows={revenueRows}
          getRowKey={(p) => p.productId}
          isLoading={isLoading}
          onRowClick={(p) => push(`/products/${p.productId}`)}
          empty={{ icon: TrendingUp, title: "No sales yet" }}
          renderRow={(p) => (
            <>
              <TableCell className="text-muted-foreground">{p.rank}</TableCell>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell className="text-right">{formatCents(p.revenue)}</TableCell>
              <TableCell className="text-right text-muted-foreground">
                {totalRevenue > 0 ? `${((p.revenue / totalRevenue) * 100).toFixed(1)}%` : "—"}
              </TableCell>
            </>
          )}
        />
      ) : (
        <DataTableShell
          columns={[
            { header: "#", className: "w-10" },
            { header: "Product" },
            { header: "Views", className: "text-right" },
          ]}
          rows={viewsRows}
          getRowKey={(p) => p.productId ?? `view-${p.rank}`}
          isLoading={isLoading}
          onRowClick={(p) => {
            if (p.productId) push(`/products/${p.productId}`);
          }}
          empty={{ icon: TrendingUp, title: "No view data yet" }}
          renderRow={(p) => (
            <>
              <TableCell className="text-muted-foreground">{p.rank}</TableCell>
              <TableCell className="font-medium">{p.name ?? "Unknown"}</TableCell>
              <TableCell className="text-right">{p.views.toLocaleString()}</TableCell>
            </>
          )}
        />
      )}
    </SectionCard>
  );
}
