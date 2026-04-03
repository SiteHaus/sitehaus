import { Badge } from "@site-haus/ui/components/base/badge";
import type { ProductStatus } from "@/lib/commerce";

const config: Record<ProductStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  draft: { label: "Draft", variant: "secondary" },
  archived: { label: "Archived", variant: "outline" },
};

export function StatusBadge({ status }: { status: ProductStatus }) {
  const { label, variant } = config[status];
  return <Badge variant={variant}>{label}</Badge>;
}
