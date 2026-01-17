"use client";

import { RequireAuth } from "@/lib/require-auth";
import { useApi } from "@/lib/typed-api";
import { useClientContext } from "@/lib/use-client-context";
import { SessionItem } from "@site-haus/contracts";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { DataTable } from "@site-haus/ui/components/shared/data-table/data-table";
import { ShieldX } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

interface SessionDisplay {
  [key: string]: unknown;
  id: string;
  clientId: string;
}

type SessionDisplayKey = Extract<keyof SessionItem, string>;

const DEFAULT_SESSION_COLUMNS: SessionDisplayKey[] = [""];

export default function SessionsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
      <SessionsContent />
    </Suspense>
  );
}

function SessionsContent() {
  const api = useApi();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedClient } = useClientContext();

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    const res = await api.sessions.list();
    if (res.status === 200) {
      setSessions(res.body.sessions);

      console.log(res.body.sessions);
      setPermissionDenied(false);
    } else if (res.status === 403) {
      setPermissionDenied(true);
    } else {
      setError("Failed to load team members.");
    }
    setLoadingSessions(false);
  }, [api]);

  useEffect(() => {
    if (!accessToken) return;

    fetchSessions();
  }, [accessToken, fetchSessions]);

  const sessionsForDisplay = useMemo<SessionDisplay[]>(
    () =>
      sessions.map((session) => ({
        id: session.id,
        clientId: session.clientId,
      })),
    [sessions]
  );

  if (permissionDenied) {
    return (
      <RequireAuth>
        <div className="container mx-auto mt-12">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <ShieldX className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground max-w-md">
              You don&apos;t have permission to manage the team for{" "}
              <span className="font-medium text-foreground">
                {selectedClient?.name ?? "this client"}
              </span>
              . Contact an administrator to request access.
            </p>
          </div>
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Sessions</h1>
        <p className="text-muted-foreground">
          View and manage active sessions for the current client.
        </p>
        <DataTable<SessionItem>
          data={sessionsForDisplay}
          defaultColumns={DEFAULT_SESSION_COLUMNS}
        />
      </div>
    </RequireAuth>
  );
}
