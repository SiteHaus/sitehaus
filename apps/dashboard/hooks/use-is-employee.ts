"use client";

import { useAuthStore } from "@site-haus/stores/auth-store";

/**
 * True if the user has admin-level access (canManage) on at least one
 * first-party (SiteHaus) client. Plain membership on a first-party OAuth app
 * (e.g. the dashboard app itself via ensureClientMembership) does NOT qualify.
 */
export function useIsEmployee() {
  return useAuthStore((s) => s.clients.some((c) => c.firstParty && c.canManage));
}
