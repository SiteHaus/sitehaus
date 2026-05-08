"use client";

import { Button } from "@site-haus/ui/components/base/button";
import { useState } from "react";
import { type PeriodOption } from "../_components/period-utils";
import { AbandonedCartsSection } from "./_components/abandoned-carts-section";
import { FunnelSection } from "./_components/funnel-section";
import { RevenueSection } from "./_components/revenue-section";
import { TopProductsTable } from "./_components/top-products-table";

const PERIODS: { label: string; value: PeriodOption }[] = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "12m", value: "12m" },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<PeriodOption>("30d");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Store performance for the selected period.
          </p>
        </div>
        <div className="flex items-center gap-1 border rounded-lg p-1">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <RevenueSection period={period} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FunnelSection period={period} />
        <AbandonedCartsSection period={period} />
      </div>

      <TopProductsTable period={period} />
    </div>
  );
}
