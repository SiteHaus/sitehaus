"use client";

import { useBillingAdmin } from "@/hooks/use-billing";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@site-haus/ui/components/base/card";
import { Button } from "@site-haus/ui/components/base/button";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@site-haus/ui/components/base/table";
import {
  AlertTriangle,
  DollarSign,
  Plus,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import { formatCents, formatDate } from "@site-haus/utils/core/format";
import { BillingRecordCard } from "./billing-record-card";
import { BillingStatusBadge } from "./billing-status-badge";
import { CreateBillingSheet } from "./create-billing-sheet";

export function AdminBillingView() {
  const { overview, loading, createSubscription, createOneTime } =
    useBillingAdmin();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (!overview) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Revenue overview and billing management.
          </p>
        </div>
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Billing
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              Monthly Recurring Revenue
            </CardDescription>
            <CardTitle className="text-2xl">
              {formatCents(overview.mrrCents)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">per month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              One-Time Revenue
            </CardDescription>
            <CardTitle className="text-2xl">
              {formatCents(overview.totalRevenueCents)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">total collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Overdue
            </CardDescription>
            <CardTitle className="text-2xl">
              {overview.overdueCount > 0 ? (
                <span className="text-destructive">
                  {formatCents(overview.overdueAmountCents)}
                </span>
              ) : (
                <span>{formatCents(0)}</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {overview.overdueCount} overdue{" "}
              {overview.overdueCount === 1 ? "record" : "records"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Active Clients
            </CardDescription>
            <CardTitle className="text-2xl">
              {overview.activeClientCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              with recurring billing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Client */}
      {overview.revenueByClient.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by Client</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>MRR</TableHead>
                  <TableHead>Total Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.revenueByClient.map((row) => (
                  <TableRow key={row.clientId}>
                    <TableCell className="font-medium">
                      {row.clientName}
                    </TableCell>
                    <TableCell>
                      {row.mrrCents > 0 ? formatCents(row.mrrCents) : "—"}
                    </TableCell>
                    <TableCell>
                      {row.totalPaidCents > 0
                        ? formatCents(row.totalPaidCents)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {row.status ? (
                        <BillingStatusBadge status={row.status} />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(row.lastPaymentAt) ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* All Records */}
      <div>
        <h2 className="text-base font-semibold mb-3">All Records</h2>
        {overview.records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border">
            <Receipt className="mb-4 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">No billing records yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create a subscription or one-time invoice to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {overview.records.map((record) => {
              const clientName = overview.revenueByClient.find(
                (r) => r.clientId === record.clientId,
              )?.clientName;
              return (
                <BillingRecordCard
                  key={record.id}
                  record={record}
                  clientName={clientName}
                />
              );
            })}
          </div>
        )}
      </div>

      <CreateBillingSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onCreateSubscription={createSubscription}
        onCreateOneTime={createOneTime}
      />
    </div>
  );
}
