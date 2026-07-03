import { formatDate } from "@site-haus/utils/core/format";
import { cn } from "@site-haus/ui/lib/utils";
import Link from "next/link";
import { checkTypeLabel, statusMeta, type StatusMonitorView } from "@/lib/status";
import { UptimeBar } from "./uptime-bar";

interface MonitorRowProps {
  monitor: StatusMonitorView;
}

// One monitor line: status dot + name on the left, 90d uptime + last-checked on
// the right. The whole row links to the monitor detail page.
export const MonitorRow = ({ monitor }: MonitorRowProps) => {
  const meta = statusMeta(monitor.status);

  return (
    <Link
      href={`/m/${monitor.id}`}
      className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn("size-2.5 shrink-0 rounded-full", meta.dot)} aria-hidden />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{monitor.name}</p>
            <span className="status-badge tone-neutral shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
              {checkTypeLabel(monitor.type)}
            </span>
          </div>
          <p className={cn("text-xs", meta.text)}>
            {meta.label}
            {monitor.openIncidentSince && (
              <span className="text-muted-foreground">
                {" "}
                · since {formatDate(monitor.openIncidentSince)}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <UptimeBar pct={monitor.uptime90d} />
        <span className="font-numeric-id text-xs text-muted-foreground">
          {monitor.latencyMs != null && (
            <span className="tabular-nums">{monitor.latencyMs}ms · </span>
          )}
          {monitor.lastCheckedAt ? `checked ${formatDate(monitor.lastCheckedAt)}` : "no checks yet"}
        </span>
      </div>
    </Link>
  );
};
