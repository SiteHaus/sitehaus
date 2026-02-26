import type { BillingRecordItem } from "@site-haus/contracts";
import { Badge } from "@site-haus/ui/components/base/badge";

type Status = BillingRecordItem["status"];

const variant = (s: Status): "success" | "warning" | "destructive" | "secondary" | "outline" => {
  switch (s) {
    case "active": return "success";
    case "paid": return "success";
    case "past_due": return "destructive";
    case "cancelled": return "secondary";
    case "refunded": return "outline";
  }
};

const label = (s: Status) => {
  switch (s) {
    case "active": return "Active";
    case "paid": return "Paid";
    case "past_due": return "Past Due";
    case "cancelled": return "Cancelled";
    case "refunded": return "Refunded";
  }
};

export function BillingStatusBadge({ status }: { status: Status }) {
  return <Badge variant={variant(status)}>{label(status)}</Badge>;
}
