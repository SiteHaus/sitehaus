"use client";

import { listShippingZones } from "@/lib/commerce";
import { Button } from "@site-haus/ui/components/base/button";
import { Skeleton } from "@site-haus/ui/components/base/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Plus, Truck } from "lucide-react";
import { useState } from "react";
import { ZoneCard } from "./_components/zone-card";
import { ZoneDialog } from "./_components/zone-dialog";

export default function ShippingPage() {
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["shipping-zones"],
    queryFn: listShippingZones,
    staleTime: 30_000,
  });

  const zones = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shipping</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure which countries you ship to and what rates apply.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4 mr-2" />
          Add Zone
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : zones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border rounded-lg bg-card">
          <Truck className="size-10 text-muted-foreground/40 mb-4" />
          <p className="font-medium">No shipping zones configured</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Add a zone to define where you ship and what rates apply.
          </p>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4 mr-2" />
            Add Zone
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {zones.map((zone) => (
            <ZoneCard key={zone.id} zone={zone} />
          ))}
        </div>
      )}

      <ZoneDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
