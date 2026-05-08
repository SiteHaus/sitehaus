"use client";

import { type ShippingRate, type ShippingZone } from "@/lib/commerce";
import { Badge } from "@site-haus/ui/components/base/badge";
import { Button } from "@site-haus/ui/components/base/button";
import { Card, CardContent, CardHeader } from "@site-haus/ui/components/base/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@site-haus/ui/components/base/table";
import { Edit2, Plus } from "lucide-react";
import { useState } from "react";
import { countryName } from "./countries";
import { RateDialog } from "./rate-dialog";
import { ZoneDialog } from "./zone-dialog";

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function RateLabel({ rate }: { rate: ShippingRate }) {
  if (rate.rateCents === 0 && rate.minOrderCents !== undefined) {
    return (
      <span>
        Free on orders over <span className="font-medium">{formatCents(rate.minOrderCents)}</span>
      </span>
    );
  }
  return <span className="font-medium">{formatCents(rate.rateCents)}</span>;
}

export function ZoneCard({ zone }: { zone: ShippingZone }) {
  const [editZoneOpen, setEditZoneOpen] = useState(false);
  const [addRateOpen, setAddRateOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ShippingRate | null>(null);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
          <div className="min-w-0">
            <h2 className="font-semibold text-base">{zone.name}</h2>
            <div className="flex flex-wrap gap-1 mt-2">
              {zone.countries.map((code) => (
                <Badge key={code} variant="secondary" className="text-xs font-normal">
                  {countryName(code)} ({code})
                </Badge>
              ))}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground"
            onClick={() => setEditZoneOpen(true)}
          >
            <Edit2 className="size-4" />
          </Button>
        </CardHeader>

        <CardContent className="pt-0">
          {zone.rates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No rates yet.</p>
          ) : (
            <div className="border rounded-md overflow-hidden mb-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rate name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Est. delivery</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zone.rates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell className="font-medium">{rate.name}</TableCell>
                      <TableCell className="text-sm">
                        <RateLabel rate={rate} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {rate.estimatedDays !== undefined ? `${rate.estimatedDays} days` : "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground"
                          onClick={() => setEditingRate(rate)}
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => setAddRateOpen(true)}>
            <Plus className="size-4 mr-1" />
            Add rate
          </Button>
        </CardContent>
      </Card>

      <ZoneDialog open={editZoneOpen} onClose={() => setEditZoneOpen(false)} zone={zone} />

      <RateDialog open={addRateOpen} onClose={() => setAddRateOpen(false)} zoneId={zone.id} />

      {editingRate && (
        <RateDialog
          open={!!editingRate}
          onClose={() => setEditingRate(null)}
          zoneId={zone.id}
          rate={editingRate}
        />
      )}
    </>
  );
}
