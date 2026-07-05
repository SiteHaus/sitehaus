"use client";

import { getAnalyticsTopProducts } from "@/lib/commerce";
import { Skeleton } from "@site-haus/ui/components/base/skeleton";
import { SectionCard } from "@/components/ui/section-card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@site-haus/ui/components/base/chart";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import { useFormatCents } from "@/lib/use-format-cents";
import { type PeriodOption, periodToParams } from "./period-utils";

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const chartConfig = {
  revenue: { label: "Revenue" },
} satisfies ChartConfig;

function truncate(s: string, max = 20) {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

export function TopProductsChart({ period }: { period: PeriodOption }) {
  const formatCents = useFormatCents();
  const { from, to } = periodToParams(period);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-top-products", period],
    queryFn: () => getAnalyticsTopProducts(from, to, 5),
  });

  const chartData = (data?.byRevenue ?? []).map((p) => ({
    name: truncate(p.name),
    revenue: p.revenue,
  }));

  return (
    <SectionCard title="Top products">
      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
          No sales data for this period
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
          >
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `$${(v / 100).toFixed(0)}`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              width={90}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatCents(value as number, { maximumFractionDigits: 0 })}
                />
              }
            />
            <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </SectionCard>
  );
}
