"use client";

import { useBillingAdmin, useBillingClient } from "@/hooks/use-billing";
import { useIsEmployee } from "@/hooks/use-is-employee";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@site-haus/ui/components/base/alert";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@site-haus/ui/components/base/card";
import { Separator } from "@site-haus/ui/components/base/separator";
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
  CreditCard,
  DollarSign,
  ExternalLink,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import { BillingRecordCard } from "./_components/billing-record-card";
import { BillingStatusBadge } from "./_components/billing-status-badge";
import { formatCents, formatDate } from "@site-haus/utils/core/format";

// ─── Admin / Employee view ────────────────────────────────────────────────────

function AdminBillingView() {
  const { overview, loading } = useBillingAdmin();

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
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Revenue overview and billing management.
        </p>
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

      {/* All records */}
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
    </div>
  );
}

// ─── Client view ─────────────────────────────────────────────────────────────

function ClientBillingView() {
  const { records, loading, openPortal } = useBillingClient();
  const [openingPortal, setOpeningPortal] = useState(false);

  const handleOpenPortal = async () => {
    setOpeningPortal(true);
    await openPortal();
    setOpeningPortal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  const overdueRecords = records.filter(
    (r) =>
      r.status === "past_due" ||
      (r.type === "one_time" && r.status === "active"),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your invoices and subscription details.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenPortal}
          disabled={openingPortal}
        >
          {openingPortal ? (
            <Spinner className="size-4 mr-2" />
          ) : (
            <ExternalLink className="mr-2 h-4 w-4" />
          )}
          Manage Payment Methods
        </Button>
      </div>

      {overdueRecords.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Payment required</AlertTitle>
          <AlertDescription>
            You have {overdueRecords.length} outstanding{" "}
            {overdueRecords.length === 1 ? "invoice" : "invoices"} that{" "}
            {overdueRecords.length === 1 ? "needs" : "need"} attention. Click{" "}
            <strong>Pay Now</strong> on the record below, or{" "}
            <button
              className="underline font-medium cursor-pointer"
              onClick={handleOpenPortal}
            >
              open the billing portal
            </button>{" "}
            to manage your payment method.
          </AlertDescription>
        </Alert>
      )}

      <Separator />

      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CreditCard className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-base font-medium">No billing records</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Your invoices and subscriptions will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <BillingRecordCard
              key={record.id}
              record={record}
              onOpenPortal={handleOpenPortal}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const isEmployee = useIsEmployee();
  return isEmployee ? <AdminBillingView /> : <ClientBillingView />;
}
