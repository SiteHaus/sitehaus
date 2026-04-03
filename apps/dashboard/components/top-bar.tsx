"use client";

import { useBreadcrumbs } from "@/hooks/use-breadcrumbs";
import { useIsEmployee } from "@/hooks/use-is-employee";
import { useAuthStore } from "@site-haus/stores/auth-store";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@site-haus/ui/components/base/breadcrumb";
import { Button } from "@site-haus/ui/components/base/button";
import { SidebarTrigger } from "@site-haus/ui/components/base/sidebar";
import Link from "next/link";
import React from "react";

export const ClientContextBar = () => {
  const managedClientId = useAuthStore((s) => s.managedClientId);
  const clients = useAuthStore((s) => s.clients);
  const setManagedClientId = useAuthStore((s) => s.setManagedClientId);
  const me = useAuthStore((s) => s.me);
  const hasPerm = useAuthStore((s) => s.hasPerm);
  const isEmployee = useIsEmployee();
  const crumbs = useBreadcrumbs();

  const activeClient = clients.find((c) => c.id === managedClientId);
  const isInClientView = isEmployee && !!activeClient && !activeClient.firstParty;
  const isClientContact = !isEmployee && !!activeClient && !activeClient.firstParty;

  const roleLabel = hasPerm("projects:manage") ? "Agency" : "Client";

  const handleExitClientView = async () => {
    setManagedClientId(null);
    await me();
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />

      {crumbs.length > 0 && (
        <>
          <Breadcrumb>
            <BreadcrumbList>
              {crumbs.map((crumb, i) => {
                const isLast = i === crumbs.length - 1;
                return (
                  <React.Fragment key={crumb.href}>
                    {i > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link href={crumb.href}>{crumb.label}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </>
      )}

      {(isInClientView || isClientContact) && (
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {isInClientView ? (
              <>
                <span className="font-medium text-foreground">{activeClient!.name}</span>
                {" · Client View"}
              </>
            ) : (
              <>
                <span className="font-medium text-foreground">{activeClient!.name}</span>
                <span className="text-muted-foreground"> · {roleLabel}</span>
              </>
            )}
          </span>
          {isInClientView && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleExitClientView}
            >
              Exit client view
            </Button>
          )}
        </div>
      )}
    </header>
  );
};
