"use client";

import { archiveProduct, getProduct, updateProduct } from "@/lib/commerce";
import { useStoreNav } from "@/lib/use-store-nav";
import { Button } from "@site-haus/ui/components/base/button";
import { Card, CardContent, CardHeader, CardTitle } from "@site-haus/ui/components/base/card";
import { Input } from "@site-haus/ui/components/base/input";
import { Label } from "@site-haus/ui/components/base/label";
import { Skeleton } from "@site-haus/ui/components/base/skeleton";
import { Textarea } from "@site-haus/ui/components/base/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "../_components/status-badge";
import { ImagesCard } from "./_components/ImagesCard";
import { InventoryCard } from "./_components/InventoryCard";
import { StatusCard } from "./_components/status-card";
import { VariantsCard } from "./_components/variants-card";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { push } = useStoreNav();
  const qc = useQueryClient();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id),
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description ?? "");
      setDirty(false);
    }
  }, [product]);

  const saveMutation = useMutation({
    mutationFn: () => updateProduct(id, { name, description: description || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product", id] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product saved");
      setDirty(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save"),
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveProduct(id),
    onSuccess: () => {
      toast.success("Product archived");
      push("/products");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to archive"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-56 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => push("/products")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold truncate">{product.name}</h1>
            <StatusBadge status={product.status} />
          </div>
        </div>
        {product.status !== "archived" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => archiveMutation.mutate()}
            disabled={archiveMutation.isPending}
            className="text-destructive hover:text-destructive"
          >
            {archiveMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Archive
          </Button>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: product content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setDirty(true);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setDirty(true);
                  }}
                  rows={5}
                />
              </div>
              {dirty && (
                <div className="flex justify-end">
                  <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                    {saveMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                    Save changes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <VariantsCard productId={id} variants={product.variants} options={product.options} />
        </div>

        {/* Right: sidebar */}
        <div className="space-y-6">
          <StatusCard productId={id} status={product.status} />
          <ImagesCard productId={id} />
          <InventoryCard variants={product.variants} />
        </div>
      </div>
    </div>
  );
}
