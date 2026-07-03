import type { ProductStatus } from "@/lib/commerce";
import { StatusBadge as KitStatusBadge } from "@/components/ui/status-badge";
import { productTone } from "@/components/ui/status-tone";

export function StatusBadge({ status }: { status: ProductStatus }) {
  return (
    <KitStatusBadge
      tone={productTone(status)}
      label={status.charAt(0).toUpperCase() + status.slice(1)}
    />
  );
}
