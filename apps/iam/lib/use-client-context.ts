"use client";

import { useAuthStore } from "@site-haus/stores/auth-store";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";

const PAGE_NAMES: Record<string, string> = {
  "/": "Home",
  "/team": "Team",
  "/roles": "Roles",
  "/invites": "Invites",
  "/my-sessions": "My Sessions",
  "/account": "Account",
  "/apps": "Apps",
};

export function useClientContext() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const session = useAuthStore((s) => s.session);
  const clients = useAuthStore((s) => s.clients);

  // Get selected client ID from URL param, fall back to session's client
  // Using "manage" param to avoid conflict with OAuth "client" param
  const selectedClientId = useMemo(() => {
    const urlClientId = searchParams.get("manage");
    return urlClientId ?? session?.clientId ?? null;
  }, [searchParams, session?.clientId]);

  // Look up the selected client object
  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find((c) => c.id === selectedClientId) ?? null;
  }, [selectedClientId, clients]);

  // Get current page display name
  const pageName = useMemo(() => {
    return PAGE_NAMES[pathname] ?? "Unknown";
  }, [pathname]);

  // Function to switch to a different client
  // Uses window.location for hard navigation to ensure all data reloads
  // Always redirects to /my-sessions (a page all users have access to)
  const setSelectedClient = useCallback(
    (clientId: string) => {
      const params = new URLSearchParams();
      params.set("manage", clientId);
      window.location.href = `/my-sessions?${params.toString()}`;
    },
    []
  );

  // Function to clear client selection (go back to session default)
  const clearSelectedClient = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("manage");
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }, [router, pathname, searchParams]);

  // Track previous client ID to detect changes
  const prevClientIdRef = useRef(selectedClientId);

  // Reload permissions when switching clients
  useEffect(() => {
    if (
      selectedClientId &&
      prevClientIdRef.current !== selectedClientId &&
      prevClientIdRef.current !== null
    ) {
      // Client changed, reload user data to get new permissions
      void useAuthStore.getState().me();
    }
    prevClientIdRef.current = selectedClientId;
  }, [selectedClientId]);

  return {
    selectedClientId,
    selectedClient,
    pageName,
    clients,
    setSelectedClient,
    clearSelectedClient,
  };
}
