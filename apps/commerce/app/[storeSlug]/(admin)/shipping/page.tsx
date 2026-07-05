"use client";

import { listShippingZones } from "@/lib/commerce";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
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

  const newZoneButton = (
    <Button onClick={() => setAddOpen(true)}>
      <Plus className="size-4" />
      Add Zone
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipping"
        subtitle={isLoading ? "—" : `${zones.length} zone${zones.length !== 1 ? "s" : ""}`}
        actions={newZoneButton}
      />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : zones.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No shipping zones"
          description="Add a zone to define where you ship and what rates apply."
          action={newZoneButton}
        />
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
