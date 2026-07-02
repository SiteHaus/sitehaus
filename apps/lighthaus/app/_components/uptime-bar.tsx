import { cn } from "@site-haus/ui/lib/utils";

interface UptimeBarProps {
  pct: number;
}

// A thin 90-day uptime meter. Green above 99%, amber when it dips, red when it
// falls apart — the fill color tracks the same thresholds the checks use.
export const UptimeBar = ({ pct }: UptimeBarProps) => {
  const fill = pct >= 99 ? "bg-emerald-500" : pct >= 95 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", fill)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
};
