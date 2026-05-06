"use client";

import { updateProduct, type ProductStatus } from "@/lib/commerce";
import { Card, CardContent, CardHeader, CardTitle } from "@site-haus/ui/components/base/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@site-haus/ui/components/base/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Props = { productId: string; status: ProductStatus };

const STATUS_LABELS: Record<ProductStatus, { label: string; description: string }> = {
  draft: { label: "Draft", description: "Not visible to customers" },
  active: { label: "Active", description: "Visible on your store" },
  archived: { label: "Archived", description: "Hidden and no longer sold" },
};

export function StatusCard({ productId, status: initialStatus }: Props) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<ProductStatus>(initialStatus);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  const mutation = useMutation({
    mutationFn: (s: ProductStatus) => updateProduct(productId, { status: s }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product", productId] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
      setStatus(initialStatus);
    },
  });

  function handleChange(value: string) {
    const next = value as ProductStatus;
    setStatus(next);
    mutation.mutate(next);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Select value={status} onValueChange={handleChange} disabled={mutation.isPending}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{STATUS_LABELS[status].description}</p>
      </CardContent>
    </Card>
  );
}
