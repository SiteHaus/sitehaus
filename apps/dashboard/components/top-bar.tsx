"use client";

import { useIsEmployee } from "@/hooks/use-is-employee";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { Button } from "@site-haus/ui/components/base/button";
import { SidebarTrigger } from "@site-haus/ui/components/base/sidebar";

export const ClientContextBar = () => {
  const managedClientId = useAuthStore((s) => s.managedClientId);
  const clients = useAuthStore((s) => s.clients);
  const setManagedClientId = useAuthStore((s) => s.setManagedClientId);
  const me = useAuthStore((s) => s.me);
  const hasPerm = useAuthStore((s) => s.hasPerm);
  const isEmployee = useIsEmployee();

  const activeClient = clients.find((c) => c.id === managedClientId);

  // Employee in a third-party client view (not their own org)
  const isInClientView =
    isEmployee && !!activeClient && !activeClient.firstParty;
  // Client contact viewing their org (must be a real business org, not an OAuth app)
  const isClientContact =
    !isEmployee && !!activeClient && !activeClient.firstParty;

  const roleLabel = hasPerm("projects:manage") ? "Agency" : "Client";

  const handleExitClientView = async () => {
    setManagedClientId(null);
    await me();
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      {(isInClientView || isClientContact) && (
        <>
          <span className="text-sm text-muted-foreground">
            {isInClientView ? (
              <>
                <span className="font-medium text-foreground">
                  {activeClient!.name}
                </span>
                {" · Client View"}
              </>
            ) : (
              <>
                <span className="font-medium text-foreground">
                  {activeClient!.name}
                </span>
                <span className="text-muted-foreground"> · {roleLabel}</span>
              </>
            )}
          </span>
          {isInClientView && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 text-xs"
              onClick={handleExitClientView}
            >
              Exit client view
            </Button>
          )}
        </>
      )}
    </header>
  );
};
