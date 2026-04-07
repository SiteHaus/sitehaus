"use client";

import { ConsolePageWrapper } from "@/app/components/console-page-wrapper";
import { PageHeader } from "@/app/components/page-header";
import { PermissionDenied } from "@/app/components/permission-denied";
import { EmptyState, LoadingState } from "@/app/components/states";
import { useApi } from "@/lib/typed-api";
import { useClientContext } from "@/lib/use-client-context";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { Badge } from "@site-haus/ui/components/base/badge";
import { Button } from "@site-haus/ui/components/base/button";
import { Card, CardContent, CardHeader, CardTitle } from "@site-haus/ui/components/base/card";
import { Input } from "@site-haus/ui/components/base/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@site-haus/ui/components/base/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@site-haus/ui/components/base/table";
import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, ChevronRight, ScrollText, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface AuditLogUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuditLogItem {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ipHash: string | null;
  meta: unknown;
  createdAt: string;
  user: AuditLogUser | null;
}

const ACTION_CATEGORIES = {
  all: "All Actions",
  auth: "Authentication",
  password: "Password",
  roles: "Roles",
  invites: "Invites",
  sessions: "Sessions",
  clients: "Clients",
} as const;

const ACTION_BY_CATEGORY: Record<string, string[]> = {
  auth: ["user.login", "user.logout", "user.registered", "user.2fa.enabled", "user.2fa.disabled"],
  password: ["user.password.changed", "user.password.reset"],
  roles: [
    "role.created",
    "role.updated",
    "role.deleted",
    "role.assigned",
    "role.unassigned",
    "role.permissions.updated",
  ],
  invites: ["invite.created", "invite.cancelled", "invite.accepted"],
  sessions: ["session.revoked", "sessions.revokedAll"],
  clients: ["client.updated", "client.redirectUri.added", "client.redirectUri.removed"],
};

function getActionBadgeVariant(
  action: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (
    action.includes("deleted") ||
    action.includes("revoked") ||
    action.includes("disabled") ||
    action.includes("cancelled")
  ) {
    return "destructive";
  }
  if (
    action.includes("created") ||
    action.includes("registered") ||
    action.includes("enabled") ||
    action.includes("accepted")
  ) {
    return "default";
  }
  return "secondary";
}

function formatAction(action: string): string {
  return action.replace(/\./g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
}

export default function AuditLogPage() {
  return (
    <ConsolePageWrapper>
      <AuditLogContent />
    </ConsolePageWrapper>
  );
}

function AuditLogContent() {
  const api = useApi();
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasPerm = useAuthStore((s) => s.hasPerm);
  const { selectedClient } = useClientContext();

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [prevCursors, setPrevCursors] = useState<string[]>([]);

  const [category, setCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchLogs = useCallback(
    async (cursor?: string, direction: "next" | "prev" | "reset" = "reset") => {
      setLoading(true);
      try {
        const actionFilter = category !== "all" ? ACTION_BY_CATEGORY[category]?.[0] : undefined;

        const res = await api.audit.list({
          query: {
            limit: 25,
            cursor,
            action: actionFilter,
          },
        });

        if (res.status === 200) {
          setLogs(res.body.logs as AuditLogItem[]);
          setNextCursor(res.body.nextCursor);
          setPermissionDenied(false);

          if (direction === "next" && cursor) {
            setPrevCursors((prev) => [...prev, cursor]);
          } else if (direction === "prev") {
            setPrevCursors((prev) => prev.slice(0, -1));
          } else if (direction === "reset") {
            setPrevCursors([]);
          }
        } else if (res.status === 403) {
          setPermissionDenied(true);
        }
      } catch (err) {
        console.error("Failed to fetch audit logs:", err);
      }
      setLoading(false);
    },
    [api, category],
  );

  useEffect(() => {
    if (accessToken) {
      fetchLogs();
    }
  }, [accessToken, fetchLogs]);

  const filteredLogs = searchQuery
    ? logs.filter(
        (log) =>
          log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.user?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.user?.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.user?.lastName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : logs;

  if (permissionDenied) {
    return <PermissionDenied resource="audit logs" clientName={selectedClient?.name} />;
  }

  return (
    <>
      <PageHeader title="Audit Log" description="View security events and activity history." />

      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user, action..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACTION_CATEGORIES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading && <LoadingState />}

      {!loading && filteredLogs.length === 0 && (
        <Card>
          <CardContent>
            <EmptyState
              icon={ScrollText}
              title="No audit logs found."
              description={
                searchQuery || category !== "all" ? "Try adjusting your filters." : undefined
              }
            />
          </CardContent>
        </Card>
      )}

      {!loading && filteredLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>
                      {log.user ? (
                        <div>
                          <div className="font-medium text-sm">
                            {log.user.firstName} {log.user.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">{log.user.email}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">System</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {formatAction(log.action)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.targetType && <span className="capitalize">{log.targetType}</span>}
                      {log.targetId && (
                        <span className="ml-1 font-mono text-xs">
                          ({log.targetId.slice(0, 8)}...)
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>

          <div className="flex items-center justify-between px-4 py-3 border-t">
            <Button
              variant="outline"
              size="sm"
              disabled={prevCursors.length === 0}
              onClick={() => {
                const prevCursor = prevCursors[prevCursors.length - 2];
                fetchLogs(prevCursor, "prev");
              }}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!nextCursor}
              onClick={() => fetchLogs(nextCursor, "next")}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
