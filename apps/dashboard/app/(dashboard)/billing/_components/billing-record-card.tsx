import type { BillingRecordItem } from "@site-haus/contracts";
import { Badge } from "@site-haus/ui/components/base/badge";
import { Button } from "@site-haus/ui/components/base/button";
import { formatCents, formatDate } from "@site-haus/utils/core/format";
import { Calendar, ExternalLink, RefreshCw, Receipt } from "lucide-react";
import { BillingStatusBadge } from "./billing-status-badge";

interface BillingRecordCardProps {
  record: BillingRecordItem;
  clientName?: string;
  /** If provided, a Pay Now button is shown for actionable records */
  onOpenPortal?: () => void;
}

function needsPayment(record: BillingRecordItem) {
  return (
    record.status === "past_due" ||
    (record.type === "one_time" && record.status === "active")
  );
}

export function BillingRecordCard({ record, clientName, onOpenPortal }: BillingRecordCardProps) {
  const isRecurring = record.type === "recurring";
  const actionable = needsPayment(record);

  const handlePay = () => {
    if (record.hostedInvoiceUrl) {
      window.open(record.hostedInvoiceUrl, "_blank");
    } else {
      onOpenPortal?.();
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 rounded-lg bg-muted p-2 shrink-0">
          {isRecurring ? (
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Receipt className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">
              {formatCents(record.amountCents)}
              {isRecurring && record.intervalMonths && (
                <span className="text-muted-foreground font-normal">
                  /{record.intervalMonths === 1 ? "mo" : `${record.intervalMonths}mo`}
                </span>
              )}
            </span>
            <Badge variant="outline" className="text-xs">
              {isRecurring ? "Recurring" : "One-Time"}
            </Badge>
          </div>

          {clientName && (
            <p className="text-xs text-muted-foreground">{clientName}</p>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            {isRecurring && record.currentPeriodStart && record.currentPeriodEnd && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDate(record.currentPeriodStart)} – {formatDate(record.currentPeriodEnd)}
              </span>
            )}
            {!isRecurring && record.createdAt && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDate(record.createdAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* For one-time invoices, "active" means outstanding — show a clearer label */}
        {!isRecurring && record.status === "active" ? (
          <Badge variant="warning">Outstanding</Badge>
        ) : (
          <BillingStatusBadge status={record.status} />
        )}

        {actionable && onOpenPortal && (
          <Button size="sm" variant="outline" onClick={handlePay}>
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Pay Now
          </Button>
        )}
      </div>
    </div>
  );
}
