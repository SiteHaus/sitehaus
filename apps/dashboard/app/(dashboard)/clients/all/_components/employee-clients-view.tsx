"use client";

import { useClients } from "@/hooks/use-clients";
import { Input } from "@site-haus/ui/components/base/input";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { Contact, Search, Users } from "lucide-react";
import { PageHero } from "@site-haus/ui/components/shared/page-hero";
import Link from "next/link";
import { useState } from "react";

export function EmployeeClientsView() {
  const { data: clients, isLoading } = useClients();
  const [search, setSearch] = useState("");

  const filtered = (clients ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHero
        icon={Users}
        title="Clients"
        subtitle={
          !isLoading
            ? `${clients?.length ?? 0} ${(clients?.length ?? 0) === 1 ? "client" : "clients"} total`
            : "Manage your client accounts."
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-6 text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border">
          <Contact className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">
            {search ? "No clients match your search" : "No clients yet"}
          </p>
          {search && (
            <p className="text-xs text-muted-foreground mt-1">
              Try a different name or clear the search.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          {filtered.map((client, i) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <div
                className={`flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-muted/50 transition-colors cursor-pointer ${
                  i < filtered.length - 1 ? "border-b" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground font-semibold text-sm">
                    {client.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{client.name}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{client.key}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">View →</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
