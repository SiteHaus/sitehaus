"use client";

import { useClientContext } from "@/lib/use-client-context";
import { useAuthStore } from "@site-haus/stores/auth-store";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@site-haus/ui/components/base/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@site-haus/ui/components/base/dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { Suspense } from "react";

function ClientSwitcherContent() {
  const user = useAuthStore((s) => s.user);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const { selectedClient, pageName, clients, setSelectedClient } =
    useClientContext();

  // Wait for bootstrap to complete (ensures clients are loaded)
  if (!user || !bootstrapped) return null;

  const clientName = selectedClient?.name ?? "Select Client";

  return (
    <div className="border-b bg-muted/30">
      <div className="container mx-auto px-4 py-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 hover:text-foreground transition-colors">
                  {clientName}
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Switch Client</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {clients.map((client) => (
                    <DropdownMenuItem
                      key={client.id}
                      onClick={() => setSelectedClient(client.id)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <span>{client.name}</span>
                      {client.id === selectedClient?.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  {clients.length === 0 && (
                    <DropdownMenuItem disabled>
                      No clients available
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{pageName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
}

export function ClientSwitcher() {
  return (
    <Suspense
      fallback={
        <div className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-2">
            <div className="h-5 w-40 animate-pulse bg-muted rounded" />
          </div>
        </div>
      }
    >
      <ClientSwitcherContent />
    </Suspense>
  );
}
