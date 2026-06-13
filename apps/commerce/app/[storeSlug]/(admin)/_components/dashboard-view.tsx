"use client";

import { Button } from "@site-haus/ui/components/base/button";
import { LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { PageHero } from "@/components/page-hero";
import { LowStockAlerts } from "./low-stock-alerts";
import { RecentOrders } from "./recent-orders";
import { RevenueChart } from "./revenue-chart";
import { StatCards } from "./stat-cards";
import { TopProductsChart } from "./top-products-chart";
import { type PeriodOption } from "./period-utils";

const PERIODS: { label: string; value: PeriodOption }[] = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
];

export function DashboardView({ firstName }: { firstName: string }) {
  const [period, setPeriod] = useState<PeriodOption>("30d");

  return (
    <div className="space-y-6">
      <PageHero
        icon={LayoutDashboard}
        title={`Welcome back, ${firstName}`}
        subtitle="Here's what's happening in your store."
        size="lg"
        className="py-14 bg-gradient-to-br from-primary/[0.08] via-sidebar to-sidebar"
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

      <StatCards period={period} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueChart period={period} />
        <TopProductsChart period={period} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RecentOrders />
        </div>
        <LowStockAlerts />
      </div>
    </div>
  );
}
