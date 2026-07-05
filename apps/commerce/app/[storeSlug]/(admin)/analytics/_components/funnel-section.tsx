"use client";

import { getAnalyticsFunnel, type FunnelStage } from "@/lib/commerce";
import { SectionCard } from "@/components/ui/section-card";
import { Skeleton } from "@site-haus/ui/components/base/skeleton";
import { useQuery } from "@tanstack/react-query";
import { type PeriodOption, periodToParams } from "../../_components/period-utils";

const STAGE_LABELS: Record<FunnelStage["stage"], string> = {
  product_viewed: "Viewed a product",
  add_to_cart: "Added to cart",
  checkout_started: "Started checkout",
  order_completed: "Completed order",
};

export function FunnelSection({ period }: { period: PeriodOption }) {
  const { from, to } = periodToParams(period);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-funnel", period],
    queryFn: () => getAnalyticsFunnel(from, to),
    staleTime: 30_000,
  });

  const stages = data?.stages ?? [];
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <SectionCard title="Conversion Funnel">
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : stages.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No funnel data for this period.
        </p>
      ) : (
        <div className="space-y-3">
          {stages.map((stage, i) => {
            const widthPct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
            return (
              <div key={stage.stage}>
                <div className="flex items-center justify-between mb-1 text-sm">
                  <span className="font-medium">{STAGE_LABELS[stage.stage]}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {stage.count.toLocaleString()}
                    {i > 0 && stage.conversionRate !== null && (
                      <span className="ml-2 text-xs">
                        ({(stage.conversionRate * 100).toFixed(1)}% from previous)
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
