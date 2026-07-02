"use client";

import { Card } from "@site-haus/ui/components/base/card";
import { Skeleton } from "@site-haus/ui/components/base/skeleton";
import { cn } from "@site-haus/ui/lib/utils";
import { label } from "@site-haus/utils/core/format";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ForbiddenError, useMonitorDetail } from "@/lib/status-client";
import { statusMeta } from "@/lib/status";
import { HistoryStrip } from "@/app/_components/history-strip";
import { IncidentTimeline } from "@/app/_components/incident-timeline";
import { UptimeBar } from "@/app/_components/uptime-bar";

interface MonitorDetailProps {
  monitorId: string;
}

export const MonitorDetail = ({ monitorId }: MonitorDetailProps) => {
  const { data, isLoading, error } = useMonitorDetail(monitorId);

  // Out-of-scope monitors 403 — surface that as a plain not-found rather than
  // confirming the monitor exists to someone who can't see it.
  if (error instanceof ForbiddenError) notFound();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-sm text-destructive">
        Couldn&apos;t load this monitor. Please try again in a moment.
      </p>
    );
  }

  const { monitor, history, incidents } = data;
  // uptime90d isn't on the detail payload; derive a quick recent number from the
  // returned history so the header still shows a meter.
  const recentUptime =
    history.length === 0
      ? 100
      : Math.round((history.filter((r) => r.status !== "down").length / history.length) * 100);
  const current = history[0]?.status ?? "up";
  const meta = statusMeta(current);

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All systems
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={cn("size-3 rounded-full", meta.dot)} aria-hidden />
          <div>
            <h1 className="text-lg font-semibold">{monitor.name}</h1>
            <p className="text-sm text-muted-foreground">
              {label(monitor.group)} · {monitor.type}
            </p>
          </div>
        </div>
        <span className={cn("text-sm font-medium", meta.text)}>{meta.label}</span>
      </header>

      <Card className="gap-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Recent uptime</span>
          <UptimeBar pct={recentUptime} />
        </div>
        <HistoryStrip history={history} />
        <p className="text-xs text-muted-foreground">Last {history.length} checks</p>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Incident history</h2>
        <IncidentTimeline incidents={incidents} />
      </section>
    </div>
  );
};
