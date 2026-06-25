"use client";

import { getAnalyticsRevenue } from "@/lib/commerce";
import { Skeleton } from "@site-haus/ui/components/base/skeleton";
import { SectionCard } from "@/components/ui/section-card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@site-haus/ui/components/base/chart";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { type PeriodOption, periodToParams } from "./period-utils";

const chartConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatAxisDate(date: string, period: PeriodOption) {
  const d = new Date(date);
  if (period === "90d") return d.toLocaleDateString("en-US", { month: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RevenueChart({ period }: { period: PeriodOption }) {
  const { from, to, granularity } = periodToParams(period);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-revenue", period],
    queryFn: () => getAnalyticsRevenue(from, to, granularity),
  });

  return (
    <SectionCard title="Revenue">
      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <AreaChart data={data?.periods ?? []} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
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
              width={48}
            />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(value) => formatCents(value as number)} />}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#revenueGradient)"
              dot={false}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </SectionCard>
  );
}
