"use client";

import { Skeleton } from "@site-haus/ui/components/base/skeleton";
import { Activity } from "lucide-react";
import { useStatusBoard } from "@/lib/status-client";
import { worstStatus } from "@/lib/status";
import { GroupCard } from "./group-card";

// Flatten every monitor across groups so the page banner can summarize the whole
// system in one line.
function overallLabel(groups: { monitors: { status: string }[] }[]): string {
  const all = groups.flatMap((g) => g.monitors);
  if (all.length === 0) return "No monitors yet";
  switch (worstStatus(all)) {
    case "down":
      return "Some systems are down";
    case "degraded":
      return "Some systems are degraded";
    default:
      return "All systems operational";
  }
}

export const StatusBoard = () => {
  const { data, isLoading, isError } = useStatusBoard();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-destructive">
        Couldn&apos;t load the status board. Please try again in a moment.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Activity className="size-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">SiteHaus Status</h1>
          <p className="text-sm text-muted-foreground">{overallLabel(data.groups)}</p>
        </div>
        {data.isStaff && (
          <span className="ml-auto rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Staff view
          </span>
        )}
      </header>

      {data.groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No monitors are visible to your account.</p>
      ) : (
        <div className="space-y-4">
          {data.groups.map((g) => (
            <GroupCard key={g.group} group={g.group} monitors={g.monitors} />
          ))}
        </div>
      )}
    </div>
  );
};
