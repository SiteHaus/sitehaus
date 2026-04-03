"use client";

import { Badge } from "@site-haus/ui/components/base/badge";

const statusConfig = {
  draft: { label: "Draft", variant: "secondary" as const },
  in_review: { label: "In Review", variant: "warning" as const },
  approved: { label: "Approved", variant: "success" as const },
  amended: { label: "Amended", variant: "default" as const },
};

export function DesignDocStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as keyof typeof statusConfig] ?? {
    label: status,
    variant: "secondary" as const,
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
