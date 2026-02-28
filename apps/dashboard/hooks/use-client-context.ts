"use client";

import { useAuthStore } from "@site-haus/stores/auth-store";

/**
 * Returns the currently managed client only if it is a real (non-first-party)
 * client organization. Returns null when the user has no client context or
 * when managedClientId points to a first-party (SiteHaus) OAuth application.
 */
export function useClientContext() {
  return useAuthStore((s) => {
    if (!s.managedClientId) return null;
    const client = s.clients.find((c) => c.id === s.managedClientId);
    return client && !client.firstParty ? client : null;
  });
}
