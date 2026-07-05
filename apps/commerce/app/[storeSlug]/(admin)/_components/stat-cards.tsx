"use client";

import { getAnalyticsRevenue, type RevenuePeriod } from "@/lib/commerce";
import { Card, CardContent, CardHeader, CardTitle } from "@site-haus/ui/components/base/card";
import { Skeleton } from "@site-haus/ui/components/base/skeleton";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, ShoppingBag, DollarSign } from "lucide-react";
import { useFormatCents } from "@/lib/use-format-cents";
import { type PeriodOption, periodToParams } from "./period-utils";

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-28" />
        ) : (
          <p className="text-2xl font-bold">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function StatCards({ period }: { period: PeriodOption }) {
  const formatCents = useFormatCents();
  const { from, to, granularity } = periodToParams(period);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-revenue", period],
    queryFn: () => getAnalyticsRevenue(from, to, granularity),
  });

  const totals = data?.periods.reduce(
    (acc: { revenue: number; orders: number }, p: RevenuePeriod) => ({
      revenue: acc.revenue + p.revenue,
      orders: acc.orders + p.orderCount,
    }),
    { revenue: 0, orders: 0 },
  ) ?? { revenue: 0, orders: 0 };

  const aov = totals.orders > 0 ? totals.revenue / totals.orders : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        title="Revenue"
        value={formatCents(totals.revenue)}
        icon={DollarSign}
        loading={isLoading}
      />
      <StatCard
        title="Orders"
        value={totals.orders.toString()}
        icon={ShoppingBag}
        loading={isLoading}
      />
      <StatCard
        title="Avg. Order Value"
        value={formatCents(aov)}
        icon={TrendingUp}
        loading={isLoading}
      />
    </div>
  );
}
