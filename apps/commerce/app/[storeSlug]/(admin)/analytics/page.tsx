"use client";

import { Button } from "@site-haus/ui/components/base/button";
import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { PageHero } from "@/components/page-hero";
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
      <PageHero
        icon={BarChart3}
        title="Analytics"
        subtitle="Store performance for the selected period."
      >
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
      </PageHero>

      <RevenueSection period={period} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FunnelSection period={period} />
        <AbandonedCartsSection period={period} />
      </div>

      <TopProductsTable period={period} />
    </div>
  );
}
