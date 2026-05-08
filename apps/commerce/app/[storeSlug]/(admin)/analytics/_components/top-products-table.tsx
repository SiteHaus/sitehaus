"use client";

import { getAnalyticsTopProducts } from "@/lib/commerce";
import { useStoreNav } from "@/lib/use-store-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@site-haus/ui/components/base/card";
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Top Products</CardTitle>
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
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pl-6">#</TableHead>
              <TableHead>Product</TableHead>
              {tab === "revenue" ? (
                <>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right pr-6">% of Total</TableHead>
                </>
              ) : (
                <TableHead className="text-right pr-6">Views</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="pl-6">
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </TableCell>
                  {tab === "revenue" && (
                    <TableCell>
                      <Skeleton className="h-4 w-12 ml-auto" />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : tab === "revenue" ? (
              (data?.byRevenue ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No sales data for this period.
                  </TableCell>
                </TableRow>
              ) : (
                (data?.byRevenue ?? []).map((p, i) => (
                  <TableRow
                    key={p.productId}
                    className="cursor-pointer"
                    onClick={() => push(`/products/${p.productId}`)}
                  >
                    <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{formatCents(p.revenue)}</TableCell>
                    <TableCell className="text-right pr-6 text-muted-foreground">
                      {totalRevenue > 0 ? `${((p.revenue / totalRevenue) * 100).toFixed(1)}%` : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )
            ) : (data?.byViews ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  No view data for this period.
                </TableCell>
              </TableRow>
            ) : (
              (data?.byViews ?? []).map((p, i) => (
                <TableRow
                  key={i}
                  className={p.productId ? "cursor-pointer" : undefined}
                  onClick={() => p.productId && push(`/products/${p.productId}`)}
                >
                  <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{p.name ?? "Unknown"}</TableCell>
                  <TableCell className="text-right pr-6">{p.views.toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
