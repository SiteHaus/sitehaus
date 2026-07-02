"use client";

import { useAuthStore } from "@site-haus/stores/auth-store";
import { useQuery } from "@tanstack/react-query";
import { statusKeys } from "@/lib/query-keys";
import type { MonitorDetail, StatusBoard } from "@/lib/status";

const BASE = process.env.NEXT_PUBLIC_LIGHTHAUS_API_URL!;

if (!BASE) {
  throw new Error("Env missing: set NEXT_PUBLIC_LIGHTHAUS_API_URL");
}

// Signals a 403 from the scoped read API — the viewer asked for a monitor
// outside their scope. Detail pages turn this into a not-found.
export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
  }
}

// lighthaus-api is plain Nest JSON (not a ts-rest contract), so we hit it with a
// raw fetch. Auth still rides the same access token the SDK keeps fresh in the
// auth store — the lighthaus AccessGuard verifies that JWT + the IAM session.
async function authedGet<T>(path: string): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${BASE}${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });

  if (res.status === 403) throw new ForbiddenError();
  if (!res.ok) throw new Error(`Status request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export function useStatusBoard() {
  return useQuery({
    queryKey: statusKeys.board(),
    queryFn: () => authedGet<StatusBoard>("/status"),
    // The board is a live wall — refresh a bit more eagerly than the app default.
    refetchInterval: 60_000,
  });
}

export function useMonitorDetail(monitorId: string) {
  return useQuery({
    queryKey: statusKeys.monitor(monitorId),
    queryFn: () => authedGet<MonitorDetail>(`/status/${monitorId}`),
    retry: false, // a ForbiddenError is terminal, not worth retrying
  });
}
