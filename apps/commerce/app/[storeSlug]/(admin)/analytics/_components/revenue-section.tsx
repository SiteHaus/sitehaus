"use client";

import { getAnalyticsRevenue, type RevenuePeriod } from "@/lib/commerce";
import { SectionCard } from "@/components/ui/section-card";
import { Skeleton } from "@site-haus/ui/components/base/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@site-haus/ui/components/base/chart";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { type PeriodOption, periodToParams } from "../../_components/period-utils";

const chartConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatAxisDate(date: string, period: PeriodOption) {
  const d = new Date(date);
  if (period === "90d" || period === "12m")
    return d.toLocaleDateString("en-US", { month: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RevenueSection({ period }: { period: PeriodOption }) {
  const { from, to, granularity } = periodToParams(period);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-revenue", period],
    queryFn: () => getAnalyticsRevenue(from, to, granularity),
    staleTime: 30_000,
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
    <SectionCard title="Revenue">
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
          ) : (
            <>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
                <p className="text-xl font-bold">{formatCents(totals.revenue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Orders</p>
                <p className="text-xl font-bold">{totals.orders.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Avg. Order Value</p>
                <p className="text-xl font-bold">{formatCents(aov)}</p>
              </div>
            </>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <ChartContainer config={chartConfig} className="h-56 w-full">
            <AreaChart data={data?.periods ?? []} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradientAnalytics" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => formatAxisDate(v, period)}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `$${(v / 100).toFixed(0)}`}
                width={52}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent formatter={(value) => formatCents(value as number)} />
                }
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#revenueGradientAnalytics)"
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </div>
    </SectionCard>
  );
}
