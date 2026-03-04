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

function getAudienceVariant(audience: boolean): BadgeVariant {
  switch (audience) {
    case true:
      return "warning";
    default:
      return "secondary";
  }
}

export function TicketAudienceBadge({ audience }: { audience: boolean }) {
  return (
    <Badge variant={getAudienceVariant(audience)}>
      {audience ? "Internal" : "External"}
    </Badge>
  );
}
