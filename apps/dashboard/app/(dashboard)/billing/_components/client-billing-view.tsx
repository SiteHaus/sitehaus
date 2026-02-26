"use client";

import { useBillingClient } from "@/hooks/use-billing";
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
import { formatCents, formatDate } from "@site-haus/utils/core/format";
import { AlertTriangle, Calendar, CreditCard, ExternalLink } from "lucide-react";
import { useState } from "react";
import { BillingRecordCard } from "./billing-record-card";
import { BillingStatusBadge } from "./billing-status-badge";

export function ClientBillingView() {
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

  const activePlan = records.find(
    (r) => r.type === "recurring" && r.status === "active",
  );
  const overdueRecords = records.filter(
    (r) =>
      r.status === "past_due" ||
      (r.type === "one_time" && r.status === "active"),
  );
  const historyRecords = records.filter((r) => r !== activePlan);

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
          Manage Payment Method
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
            to update your payment method.
          </AlertDescription>
        </Alert>
      )}

      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CreditCard className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-base font-medium">No billing records yet</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Your billing details will appear here once your project is set up.
          </p>
        </div>
      ) : (
        <>
          {activePlan && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">Your Plan</CardTitle>
                    <CardDescription className="mt-1">
                      {formatCents(activePlan.amountCents)}
                      {activePlan.intervalMonths === 1
                        ? "/month"
                        : ` every ${activePlan.intervalMonths} months`}
                    </CardDescription>
                  </div>
                  <BillingStatusBadge status={activePlan.status} />
                </div>
              </CardHeader>
              {activePlan.currentPeriodEnd && (
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>
                      Next charge of{" "}
                      <strong className="text-foreground">
                        {formatCents(activePlan.amountCents)}
                      </strong>{" "}
                      on {formatDate(activePlan.currentPeriodEnd)}
                    </span>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {historyRecords.length > 0 && (
            <>
              <Separator />
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Payment History
                </h2>
                <div className="space-y-3">
                  {historyRecords.map((record) => (
                    <BillingRecordCard
                      key={record.id}
                      record={record}
                      onOpenPortal={handleOpenPortal}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
