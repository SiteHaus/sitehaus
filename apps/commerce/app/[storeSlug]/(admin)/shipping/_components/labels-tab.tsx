"use client";

import {
  deletePreset,
  getOriginAddress,
  getPostageBalance,
  listLedger,
  listPresets,
} from "@/lib/commerce";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@site-haus/ui/components/base/button";
import { Skeleton } from "@site-haus/ui/components/base/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@site-haus/ui/components/base/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useFormatCents } from "@/lib/use-format-cents";
import { OriginAddressDialog } from "./origin-address-dialog";
import { PresetDialog } from "./preset-dialog";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function LabelsTab() {
  const qc = useQueryClient();
  const formatCents = useFormatCents();

  const [addPresetOpen, setAddPresetOpen] = useState(false);
  const [editOriginOpen, setEditOriginOpen] = useState(false);
  const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null);

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ["postage-balance"],
    queryFn: getPostageBalance,
    staleTime: 30_000,
  });

  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: ["postage-ledger"],
    queryFn: listLedger,
    staleTime: 30_000,
  });

  const { data: presets, isLoading: presetsLoading } = useQuery({
    queryKey: ["parcel-presets"],
    queryFn: listPresets,
    staleTime: 30_000,
  });

  const { data: origin, isLoading: originLoading } = useQuery({
    queryKey: ["shipping-origin"],
    queryFn: getOriginAddress,
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (presetId: string) => deletePreset(presetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parcel-presets"] });
      toast.success("Preset deleted");
      setDeletingPresetId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const entries = ledger?.items ?? [];
  const presetItems = presets?.items ?? [];
  const hasOrigin = !!origin?.originLine1;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Postage balance"
        description="SiteHaus fronts real carrier postage and bills your card automatically at $50 unpaid or month's end, whichever comes first."
      >
        {balanceLoading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <p className="text-2xl font-semibold">
            {balance ? formatCents(balance.pendingCents) : formatCents(0)}
          </p>
        )}
      </SectionCard>

      <SectionCard title="Postage transactions" description="Every label charge and settlement.">
        {ledgerLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No postage transactions yet.</p>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(entry.createdAt)}
                    </TableCell>
                    <TableCell className="capitalize">{entry.type}</TableCell>
                    <TableCell>{formatCents(entry.amountCents)}</TableCell>
                    <TableCell className="capitalize">{entry.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Box presets"
        description="Saved sizes, confirmed at label time — no bin-packing."
        actions={
          <Button variant="outline" size="sm" onClick={() => setAddPresetOpen(true)}>
            <Plus className="size-4 mr-1" />
            Add preset
          </Button>
        }
      >
        {presetsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : presetItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No box presets yet.</p>
        ) : (
          <ul className="divide-y">
            {presetItems.map((preset) => (
              <li key={preset.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  <span className="font-medium">{preset.name}</span>{" "}
                  <span className="text-muted-foreground">
                    — {preset.lengthIn}&quot; × {preset.widthIn}&quot; × {preset.heightIn}&quot;
                  </span>
                </span>
                {deletingPresetId === preset.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-destructive">Delete?</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingPresetId(null)}
                      disabled={deleteMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(preset.id)}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending && <Loader2 className="size-3 animate-spin" />}
                      Yes, delete
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeletingPresetId(preset.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Ship-from address"
        description="The origin address printed on every label you buy."
        actions={
          <Button variant="outline" size="sm" onClick={() => setEditOriginOpen(true)}>
            <Pencil className="size-4 mr-1" />
            {hasOrigin ? "Edit" : "Add address"}
          </Button>
        }
      >
        {originLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : hasOrigin ? (
          <div className="text-sm space-y-0.5">
            <p className="font-medium">{origin!.originName}</p>
            <p>{origin!.originLine1}</p>
            {origin!.originLine2 && <p>{origin!.originLine2}</p>}
            <p>
              {origin!.originCity}, {origin!.originState} {origin!.originZip}
            </p>
            <p>{origin!.originCountry}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-2">
            No ship-from address set yet — required before buying your first label.
          </p>
        )}
      </SectionCard>

      <PresetDialog open={addPresetOpen} onClose={() => setAddPresetOpen(false)} />

      <OriginAddressDialog
        open={editOriginOpen}
        onClose={() => setEditOriginOpen(false)}
        address={origin}
      />
    </div>
  );
}
