"use client";

import { getAnalyticsAbandonedCarts, getAnalyticsAbandonedCartsList } from "@/lib/commerce";
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
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
import { type PeriodOption, periodToParams } from "../../_components/period-utils";

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AbandonedCartsSection({ period }: { period: PeriodOption }) {
  const { from, to } = periodToParams(period);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["analytics-abandoned-carts", period],
    queryFn: () => getAnalyticsAbandonedCarts(from, to),
    staleTime: 30_000,
  });

  const { data: list, isLoading: listLoading } = useQuery({
    queryKey: ["analytics-abandoned-carts-list", period],
    queryFn: () => getAnalyticsAbandonedCartsList(from, to, 20),
    staleTime: 30_000,
  });

  const hasAbandonedCarts = summary && summary.abandoned > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Abandoned Carts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary stats */}
        {summaryLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !hasAbandonedCarts ? (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-2">
            <ShoppingCart className="size-8 opacity-30" />
            <p className="text-sm font-medium">No abandoned carts in this period.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-md bg-muted px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">Carts Started</p>
              <p className="text-xl font-bold">{summary.totalCartsWithItems.toLocaleString()}</p>
            </div>
            <div className="rounded-md bg-muted px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">Abandoned</p>
              <p className="text-xl font-bold text-destructive">
                {summary.abandoned.toLocaleString()}
              </p>
            </div>
            <div className="rounded-md bg-muted px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">Abandonment Rate</p>
              <p className="text-xl font-bold">{(summary.abandonedRate * 100).toFixed(1)}%</p>
            </div>
          </div>
        )}

        {/* Per-cart table */}
        {hasAbandonedCarts && (
          <div>
            <p className="text-sm font-medium mb-3">Recent abandoned carts</p>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cart</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Est. Value</TableHead>
                    <TableHead className="text-right">Abandoned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-8 ml-auto" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16 ml-auto" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24 ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (list?.items ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-6 text-muted-foreground text-sm"
                      >
                        No cart records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (list?.items ?? []).map((cart) => (
                      <TableRow key={cart.cartId}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {cart.cartId.slice(0, 8)}…
                          <span className="ml-2 text-xs font-sans font-normal">
                            {cart.isAnonymous ? "Guest" : "Member"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{cart.itemCount}</TableCell>
                        <TableCell className="text-right">
                          {formatCents(cart.estimatedValueCents)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-xs">
                          {formatDate(cart.lastActivityAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {list && list.total > 20 && (
              <p className="text-xs text-muted-foreground mt-2 text-right">
                Showing 20 of {list.total.toLocaleString()} abandoned carts
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
