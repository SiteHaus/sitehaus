"use client";

import { useAuthStore } from "@site-haus/stores/auth-store";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ComponentProps, useCallback, useEffect, useMemo, useRef } from "react";

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

  // Build href that preserves the manage param
  const buildHref = useCallback(
    (path: string) => {
      if (!selectedClientId) return path;
      const url = new URL(path, "http://dummy");
      url.searchParams.set("manage", selectedClientId);
      return `${url.pathname}${url.search}`;
    },
    [selectedClientId]
  );

  return {
    selectedClientId,
    selectedClient,
    pageName,
    clients,
    setSelectedClient,
    clearSelectedClient,
    buildHref,
  };
}

/**
 * Get the manage param from window.location (safe for SSR)
 */
function getManageParam(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return new URLSearchParams(window.location.search).get("manage");
  } catch {
    return null;
  }
}

/**
 * Build href that preserves the manage param
 * Standalone function that doesn't use React hooks (avoids Suspense requirement)
 */
function buildClientHref(path: string): string {
  const manage = getManageParam();
  if (!manage) return path;
  const url = new URL(path, "http://dummy");
  url.searchParams.set("manage", manage);
  return `${url.pathname}${url.search}`;
}

/**
 * Link component that preserves the ?manage= client selection param
 * Uses window.location directly to avoid useSearchParams Suspense requirement
 */
export function ClientLink({
  href,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  // Read manage param on each render (client-side only)
  const builtHref = buildClientHref(href);
  return <Link href={builtHref} {...props} />;
}
