import { formatDate } from "@site-haus/utils/core/format";
import { cn } from "@site-haus/ui/lib/utils";
import Link from "next/link";
import { checkLabel, statusMeta, type StatusMonitorView } from "@/lib/status";
import { UptimeBar } from "./uptime-bar";

interface MonitorRowProps {
  monitor: StatusMonitorView;
  isStaff: boolean;
  // When false (inside a per-site accordion) the row omits the site name and
  // reads as a subordinate, indented sub-item of the site above it.
  showName?: boolean;
}

// A de-emphasized check row under a site: small status dot + audience-aware label
// on the left; 90-day uptime + latency + last-checked on the right. A healthy
// check shows no status word (the dot carries it); down/degraded is called out.
export const MonitorRow = ({ monitor, isStaff, showName = true }: MonitorRowProps) => {
  const meta = statusMeta(monitor.status);
  const unhealthy = monitor.status !== "up";

  return (
    <Link
      href={`/m/${monitor.id}`}
      className="flex items-center justify-between gap-4 py-2 pl-10 pr-4 transition-colors hover:bg-muted/50"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={cn("size-2 shrink-0 rounded-full", meta.dot)} aria-hidden />
        {showName && <span className="truncate text-sm font-medium">{monitor.name}</span>}
        <span className="truncate text-[13px] text-foreground/85">
          {checkLabel(monitor.type, isStaff)}
        </span>
        {unhealthy && (
          <span className={cn("shrink-0 text-xs font-medium", meta.text)}>
            {meta.label}
            {monitor.openIncidentSince && (
              <span className="text-muted-foreground">
                {" "}
                · since {formatDate(monitor.openIncidentSince)}
              </span>
            )}
          </span>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <UptimeBar pct={monitor.uptime90d} pending={!monitor.lastCheckedAt} />
        <span className="font-numeric-id text-[11px] text-muted-foreground">
          {monitor.latencyMs != null && (
            <span className="tabular-nums">{monitor.latencyMs}ms · </span>
          )}
          {monitor.lastCheckedAt ? `checked ${formatDate(monitor.lastCheckedAt)}` : "no checks yet"}
        </span>
      </div>
    </Link>
  );
};
