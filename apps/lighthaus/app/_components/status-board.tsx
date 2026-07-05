"use client";

import { Skeleton } from "@site-haus/ui/components/base/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@site-haus/ui/components/base/tabs";
import { Activity } from "lucide-react";
import { useStatusBoard } from "@/lib/status-client";
import { worstStatus, type StatusMonitorView } from "@/lib/status";
import { GroupCard } from "./group-card";
import { StatusHeaderActions } from "./status-header-actions";

const STAGING_GROUP = "staging";

type Group = { group: string; monitors: StatusMonitorView[] };

// Flatten every monitor across the given groups so the page banner can summarize
// them in one line. Called with production groups only, so a broken staging box
// never makes the headline read as an outage.
function overallLabel(groups: Group[]): string {
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

  // Staging is dev noise — split it behind a tab for staff. Clients only ever see
  // their own client-site group, so they never get tabs (and the headline, scoped
  // to production, reflects their site).
  const prodGroups = data.groups.filter((g) => g.group !== STAGING_GROUP);
  const stagingGroups = data.groups.filter((g) => g.group === STAGING_GROUP);
  const showTabs = data.isStaff && stagingGroups.length > 0;

  const renderGroups = (groups: Group[]) => (
    <div className="space-y-4">
      {groups.map((g) => (
        <GroupCard key={g.group} group={g.group} monitors={g.monitors} isStaff={data.isStaff} />
      ))}
    </div>
  );

  return (
    <div className="sh-fade-in space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Activity className="size-5" />
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
            Status
          </p>
          <h1 className="font-display text-2xl leading-tight font-semibold">SiteHaus Status</h1>
          <p className="text-sm text-muted-foreground">{overallLabel(prodGroups)}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {data.isStaff && (
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              Staff view
            </span>
          )}
          <StatusHeaderActions />
        </div>
      </header>

      {data.groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No monitors are visible to your account.</p>
      ) : showTabs ? (
        <Tabs defaultValue="production">
          <TabsList>
            <TabsTrigger value="production">Production</TabsTrigger>
            <TabsTrigger value="staging">Staging</TabsTrigger>
          </TabsList>
          <TabsContent value="production" className="mt-4">
            {renderGroups(prodGroups)}
          </TabsContent>
          <TabsContent value="staging" className="mt-4">
            {renderGroups(stagingGroups)}
          </TabsContent>
        </Tabs>
      ) : (
        renderGroups(data.groups)
      )}
    </div>
  );
};
