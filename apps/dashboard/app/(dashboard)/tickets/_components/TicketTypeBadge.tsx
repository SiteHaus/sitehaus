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

function getTypeVariant(type: string): BadgeVariant {
  switch (type.toLowerCase()) {
    case "bug":
      return "destructive";
    case "question":
      return "purple";
    case "request":
      return "blue";
    default:
      return "secondary";
  }
}

export function TicketTypeBadge({ type }: { type: string }) {
  return <Badge variant={getTypeVariant(type)}>{label(type)}</Badge>;
}
