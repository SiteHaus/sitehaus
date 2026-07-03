"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@site-haus/ui/components/base/table";
import type { AdminOrderSummary } from "@/lib/commerce";
import { formatCents, formatDate } from "@/lib/format";

export function AbandonedDrawer({
  items,
  total,
  onOpenOrder,
}: {
  items: AdminOrderSummary[];
  total: number;
  onOpenOrder: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (total === 0) return null;

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-dashed border-border/70 bg-card/40">
      <button
        className="flex w-full items-center gap-2 px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        <span className="font-medium">Abandoned checkouts</span>
        <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{total}</span>
        <span className="ml-auto hidden text-xs sm:inline">
          never paid · auto-cleaned, not counted
        </span>
      </button>
      {open && (
        <div className="border-t border-border/60 opacity-70">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((o) => (
                <TableRow key={o.id} className="cursor-pointer" onClick={() => onOpenOrder(o.id)}>
                  <TableCell className="font-numeric-id text-sm font-medium">
                    #{o.id.slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell>{o.email}</TableCell>
                  <TableCell>{o.itemCount}</TableCell>
                  <TableCell>{formatCents(o.totalCents, o.currency)}</TableCell>
                  <TableCell>{formatDate(o.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {total > 50 && (
            <p className="py-2 text-center text-xs text-muted-foreground">Showing 50 of {total}</p>
          )}
        </div>
      )}
    </div>
  );
}
