"use client";

import { useAuthStore } from "@site-haus/stores/auth-store";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from "react";

const PAGE_NAMES: Record<string, string> = {
  "/": "Home",
  "/team": "Team",
  "/roles": "Roles",
  "/invites": "Invites",
  "/my-sessions": "My Sessions",
  "/account": "Account",
  "/apps": "Apps",
  "/audit-log": "Audit Log",
};

export function useClientContext() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const session = useAuthStore((s) => s.session);
  const clients = useAuthStore((s) => s.clients);

  // Get selected client ID from URL param, fall back to session's client
  // Using "manage" param to avoid conflict with OAuth "client" param
  const rawSelectedClientId = useMemo(() => {
    const urlClientId = searchParams.get("manage");
    return urlClientId ?? session?.clientId ?? null;
  }, [searchParams, session?.clientId]);

  // Look up the selected client object
  // Falls back to first available client if session's client is hidden/filtered
  const selectedClient = useMemo(() => {
    if (!rawSelectedClientId) return clients[0] ?? null;
    const found = clients.find((c) => c.id === rawSelectedClientId);
    return found ?? clients[0] ?? null;
  }, [rawSelectedClientId, clients]);

  // Actual selected client ID (may differ from raw if fallback was used)
  const selectedClientId = selectedClient?.id ?? null;

  // Get current page display name
  const pageName = useMemo(() => {
    return PAGE_NAMES[pathname] ?? "Unknown";
  }, [pathname]);

  // Function to switch to a different client
  // Uses window.location for hard navigation to ensure all data reloads
  // Always redirects to /my-sessions (a page all users have access to)
  const setSelectedClient = useCallback((clientId: string) => {
    const params = new URLSearchParams();
    params.set("manage", clientId);
    window.location.href = `/my-sessions?${params.toString()}`;
  }, []);

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
    [selectedClientId],
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
 *
 * Hydration-safe: renders base href on server and first client render,
 * then updates to include manage param after mount.
 */
export function ClientLink({
  href,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // On server and first client render, use base href to avoid hydration mismatch
  // After mount, read from window.location to get manage param
  const builtHref = mounted ? buildClientHref(href) : href;
  return <Link href={builtHref} {...props} />;
}
