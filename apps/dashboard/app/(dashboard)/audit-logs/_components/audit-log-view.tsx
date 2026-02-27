"use client";

import type { AuditLogItem } from "@site-haus/contracts";
import { getApi } from "@site-haus/stores/api";
import { Badge } from "@site-haus/ui/components/base/badge";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@site-haus/ui/components/base/card";
import { Input } from "@site-haus/ui/components/base/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@site-haus/ui/components/base/select";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ClipboardList, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";

// ─── Action catalogue ────────────────────────────────────────────────────────

type ActionEntry = { value: string; label: string };
type ActionCategory = { label: string; actions: ActionEntry[] };

const ACTION_CATEGORIES: ActionCategory[] = [
  {
    label: "Auth",
    actions: [
      { value: "user.login", label: "Login" },
      { value: "user.logout", label: "Logout" },
      { value: "user.registered", label: "Registered" },
      { value: "user.password.changed", label: "Password changed" },
      { value: "user.password.reset", label: "Password reset" },
      { value: "session.revoked", label: "Session revoked" },
    ],
  },
  {
    label: "Projects",
    actions: [
      { value: "project.created", label: "Project created" },
      { value: "project.updated", label: "Project updated" },
      { value: "project.status_changed", label: "Project status changed" },
      { value: "project.cancelled", label: "Project cancelled" },
    ],
  },
  {
    label: "Milestones",
    actions: [
      { value: "milestone.created", label: "Milestone created" },
      { value: "milestone.updated", label: "Milestone updated" },
      { value: "milestone.deleted", label: "Milestone deleted" },
      { value: "milestone.reordered", label: "Milestones reordered" },
    ],
  },
  {
    label: "Tickets",
    actions: [
      { value: "ticket.created", label: "Ticket created" },
      { value: "ticket.updated", label: "Ticket updated" },
      { value: "ticket.status_changed", label: "Ticket status changed" },
      { value: "ticket.assigned", label: "Ticket assigned" },
      { value: "ticket.unassigned", label: "Ticket unassigned" },
    ],
  },
  {
    label: "Design Docs",
    actions: [
      { value: "design-document.created", label: "Design doc created" },
      { value: "design-document.published", label: "Design doc published" },
      { value: "design-document.status_changed", label: "Design doc status changed" },
    ],
  },
  {
    label: "Assets",
    actions: [
      { value: "asset.uploaded", label: "Asset uploaded" },
      { value: "asset.deleted", label: "Asset deleted" },
    ],
  },
  {
    label: "Comments",
    actions: [
      { value: "comment.created", label: "Comment created" },
      { value: "comment.updated", label: "Comment updated" },
      { value: "comment.deleted", label: "Comment deleted" },
    ],
  },
  {
    label: "Billing",
    actions: [
      { value: "billing.subscription.created", label: "Subscription created" },
      { value: "billing.one_time.created", label: "One-time invoice created" },
    ],
  },
  {
    label: "Team",
    actions: [
      { value: "invite.created", label: "Invite sent" },
      { value: "invite.accepted", label: "Invite accepted" },
      { value: "invite.cancelled", label: "Invite cancelled" },
      { value: "role.created", label: "Role created" },
      { value: "role.updated", label: "Role updated" },
      { value: "role.deleted", label: "Role deleted" },
      { value: "role.assigned", label: "Role assigned" },
      { value: "role.unassigned", label: "Role unassigned" },
      { value: "role.permissions.updated", label: "Role permissions updated" },
      { value: "client.created", label: "Client created" },
      { value: "client.updated", label: "Client updated" },
    ],
  },
];

const ACTION_MAP = new Map(
  ACTION_CATEGORIES.flatMap((c) => c.actions.map((a) => [a.value, a.label]))
);

function formatAction(action: string): string {
  return ACTION_MAP.get(action) ?? action;
}

// ─── Badge variant ────────────────────────────────────────────────────────────

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

function actionVariant(action: string): BadgeVariant {
  if (
    action.includes("deleted") ||
    action.includes("cancelled") ||
    action.includes("revoked")
  ) {
    return "destructive";
  }
  if (
    action.includes("created") ||
    action.includes("registered") ||
    action.includes("accepted") ||
    action.includes("uploaded") ||
    action.includes("published")
  ) {
    return "default";
  }
  return "secondary";
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function AuditRow({ log }: { log: AuditLogItem }) {
  const actorName = log.user
    ? `${log.user.firstName} ${log.user.lastName}`.trim() || log.user.email
    : "System";
  const actorEmail = log.user?.email ?? null;

  const date = new Date(log.createdAt);
  const dateStr = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex items-start gap-4 px-4 py-3 border-b last:border-0 hover:bg-muted/30 transition-colors">
      <div className="w-32 shrink-0 text-right">
        <p className="text-xs font-medium tabular-nums">{dateStr}</p>
        <p className="text-xs text-muted-foreground tabular-nums">{timeStr}</p>
      </div>

      <div className="w-44 shrink-0">
        <p className="text-sm font-medium truncate">{actorName}</p>
        {actorEmail && actorEmail !== actorName && (
          <p className="text-xs text-muted-foreground truncate">{actorEmail}</p>
        )}
      </div>

      <div className="flex-1 min-w-0 flex items-start gap-2 flex-wrap">
        <Badge variant={actionVariant(log.action)} className="text-xs shrink-0">
          {formatAction(log.action)}
        </Badge>
        {log.targetType && (
          <span className="text-xs text-muted-foreground pt-0.5">
            {log.targetType}
            {log.targetId && (
              <span className="font-mono ml-1 opacity-50">
                {log.targetId.slice(0, 8)}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main view ───────────────────────────────────────────────────────────────

export function AuditLogView() {
  const [actionFilter, setActionFilter] = useState<string>("");
  const [userSearch, setUserSearch] = useState<string>("");

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: ["audit-logs", { action: actionFilter || undefined }],
      initialPageParam: undefined as string | undefined,
      queryFn: async ({ pageParam }) => {
        const res = await getApi().audit.list({
          query: {
            action: actionFilter || undefined,
            cursor: pageParam,
            limit: 50,
          },
        });
        if (res.status !== 200) throw new Error("Failed to load audit logs");
        return res.body;
      },
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 30_000,
    });

  const allLogs = useMemo(
    () => data?.pages.flatMap((p) => p.logs) ?? [],
    [data]
  );

  const filtered = useMemo(() => {
    if (!userSearch.trim()) return allLogs;
    const q = userSearch.toLowerCase();
    return allLogs.filter((log) => {
      if (!log.user) return false;
      const name =
        `${log.user.firstName} ${log.user.lastName} ${log.user.email}`.toLowerCase();
      return name.includes(q);
    });
  }, [allLogs, userSearch]);

  const hasFilters = !!actionFilter || !!userSearch;

  function handleActionChange(val: string) {
    setActionFilter(val === "all" ? "" : val);
  }

  function handleClearFilters() {
    setActionFilter("");
    setUserSearch("");
  }

  return (
    <div className="space-y-6 pt-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          A record of all actions taken across your workspace.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="text-sm font-medium">Filters</span>
        </div>

        <Select value={actionFilter || "all"} onValueChange={handleActionChange}>
          <SelectTrigger className="w-52 h-8 text-sm">
            <SelectValue placeholder="All events" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            {ACTION_CATEGORIES.map((cat) => (
              <div key={cat.label}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {cat.label}
                </div>
                {cat.actions.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Filter by user..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="pl-8 h-8 w-52 text-sm"
          />
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground"
            onClick={handleClearFilters}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {/* Column headers */}
        <CardHeader className="py-2.5 px-4 border-b bg-muted/30">
          <div className="flex items-center gap-4">
            <div className="w-32 shrink-0 text-right">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Time
              </span>
            </div>
            <div className="w-44 shrink-0">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Actor
              </span>
            </div>
            <div className="flex-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Event
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner className="size-6 text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <ClipboardList className="mb-3 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm font-medium">No events found</p>
              {hasFilters && (
                <p className="text-xs text-muted-foreground mt-1">
                  Try adjusting your filters.
                </p>
              )}
            </div>
          ) : (
            filtered.map((log) => <AuditRow key={log.id} log={log} />)
          )}
        </CardContent>
      </Card>

      {/* Load more */}
      {hasNextPage && (
        <div className="flex justify-center pb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage && <Spinner className="size-3.5 mr-2" />}
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
