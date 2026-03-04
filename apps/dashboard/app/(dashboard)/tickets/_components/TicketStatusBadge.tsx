"use client";

import { Badge } from "@site-haus/ui/components/base/badge";
import { label } from "@site-haus/utils/core/format";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "blue"
  | "purple";

function getStatusVariant(status: string): BadgeVariant {
  switch (status.toLowerCase()) {
    case "open":
      return "blue";
    case "in_progress":
      return "warning";
    case "resolved":
      return "success";
    case "closed":
      return "secondary";
    default:
      return "secondary";
  }
}

export function TicketStatusBadge({ status }: { status: string }) {
  return <Badge variant={getStatusVariant(status)}>{label(status)}</Badge>;
}
