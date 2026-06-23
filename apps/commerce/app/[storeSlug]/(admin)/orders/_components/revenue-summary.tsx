"use client";

import { getAnalyticsRevenue } from "@/lib/commerce";
import { ChartContainer, type ChartConfig } from "@site-haus/ui/components/base/chart";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart } from "recharts";

const config = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
} satisfies ChartConfig;

function monthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to), label: now.toLocaleString("en-US", { month: "long" }) };
}

export function RevenueSummary() {
  const { from, to, label } = monthRange();
  const { data } = useQuery({
    queryKey: ["analytics", "revenue", from, to],
    queryFn: () => getAnalyticsRevenue(from, to, "day"),
  });

  const periods = data?.periods ?? [];
  // NOTE: verify the unit of `revenue` against a known order. If it is already
  // in dollars (not cents), drop the `/ 100` below.
  const totalCents = periods.reduce((sum, p) => sum + p.revenue, 0);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(totalCents / 100);

  return (
    <div className="text-right">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
        Revenue · {label}
      </p>
      <div className="mt-1 flex items-end justify-end gap-3">
        {periods.length > 1 && (
          <ChartContainer config={config} className="h-7 w-24">
            <AreaChart data={periods}>
              <Area
                dataKey="revenue"
                type="monotone"
                stroke="var(--chart-1)"
                fill="var(--chart-1)"
                fillOpacity={0.15}
                strokeWidth={2}
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        )}
        <span className="font-display text-3xl font-medium tracking-tight tabular-nums">
          {formatted}
        </span>
      </div>
    </div>
  );
}
