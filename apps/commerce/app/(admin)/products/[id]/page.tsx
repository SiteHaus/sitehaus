"use client";

import {
  archiveProduct,
  createVariant,
  deleteVariant,
  getProduct,
  updateProduct,
  updateVariant,
  type VariantAdmin,
} from "@/lib/commerce";
import { Button } from "@site-haus/ui/components/base/button";
import { Card, CardContent, CardHeader, CardTitle } from "@site-haus/ui/components/base/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@site-haus/ui/components/base/dialog";
import { Input } from "@site-haus/ui/components/base/input";
import { Label } from "@site-haus/ui/components/base/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@site-haus/ui/components/base/select";
import { Skeleton } from "@site-haus/ui/components/base/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@site-haus/ui/components/base/table";
import { Textarea } from "@site-haus/ui/components/base/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "../_components/status-badge";

function formatCents(cents: number) {
  return (cents / 100).toFixed(2);
}

function parseDollars(val: string) {
  return Math.round(parseFloat(val) * 100);
}

type VariantDialogState =
  | { mode: "create" }
  | { mode: "edit"; variant: VariantAdmin };

function VariantDialog({
  open,
  onClose,
  state,
  productId,
}: {
  open: boolean;
  onClose: () => void;
  state: VariantDialogState;
  productId: string;
}) {
  const qc = useQueryClient();
  const isEdit = state.mode === "edit";

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [compareAt, setCompareAt] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (isEdit) {
      setName(state.variant.name);
      setSku(state.variant.sku ?? "");
      setPrice(formatCents(state.variant.priceCents));
      setCompareAt(state.variant.compareAtCents ? formatCents(state.variant.compareAtCents) : "");
      setIsActive(state.variant.isActive);
    } else {
      setName("");
      setSku("");
      setPrice("");
      setCompareAt("");
      setIsActive(true);
    }
  }, [open, state]);

  const mutation = useMutation({
    mutationFn: async () => {
      const priceCents = parseDollars(price);
      const compareAtCents = compareAt ? parseDollars(compareAt) : undefined;

      if (isEdit) {
        return updateVariant(state.variant.id, { name, sku: sku || undefined, priceCents, compareAtCents, isActive });
      }
      return createVariant(productId, { name, sku: sku || undefined, priceCents, compareAtCents, isActive });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product", productId] });
      toast.success(isEdit ? "Variant updated" : "Variant added");
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save variant"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Variant" : "Add Variant"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 60 Capsules" autoFocus />
          </div>
          <div className="space-y-2">
            <Label>SKU</Label>
            <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Optional" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Price ($)</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Compare at ($)</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={compareAt}
                onChange={(e) => setCompareAt(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Availability</Label>
            <Select value={isActive ? "active" : "inactive"} onValueChange={(v) => setIsActive(v === "active")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !name.trim() || !price}
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "Save" : "Add Variant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id),
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "active" | "archived">("draft");
  const [dirty, setDirty] = useState(false);
  const [variantDialog, setVariantDialog] = useState<{ open: boolean; state: VariantDialogState }>({
    open: false,
    state: { mode: "create" },
  });

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description ?? "");
      setStatus(product.status);
      setDirty(false);
    }
  }, [product]);

  const saveMutation = useMutation({
    mutationFn: () => updateProduct(id, { name, description: description || undefined, status }),
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
      router.push("/products");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to archive"),
  });

  const deleteVariantMutation = useMutation({
    mutationFn: (variantId: string) => deleteVariant(variantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product", id] });
      toast.success("Variant removed");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to remove variant"),
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/products")}>
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
            {archiveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Archive
          </Button>
        )}
      </div>

      {/* Details card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => { setName(e.target.value); setDirty(true); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => { setDescription(e.target.value); setDirty(true); }}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => { setStatus(v as typeof status); setDirty(true); }}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
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

      {/* Variants card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Variants</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setVariantDialog({ open: true, state: { mode: "create" } })}
          >
            <Plus className="size-4" />
            Add Variant
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {product.variants.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 pb-6">
              No variants yet. Add at least one to make this product purchasable.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.variants.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell className="text-muted-foreground">{v.sku ?? "—"}</TableCell>
                    <TableCell>${formatCents(v.priceCents)}</TableCell>
                    <TableCell>{v.stock - v.reserved}</TableCell>
                    <TableCell>
                      <span className={v.isActive ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                        {v.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => setVariantDialog({ open: true, state: { mode: "edit", variant: v } })}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => deleteVariantMutation.mutate(v.id)}
                          disabled={deleteVariantMutation.isPending}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <VariantDialog
        open={variantDialog.open}
        onClose={() => setVariantDialog((s) => ({ ...s, open: false }))}
        state={variantDialog.state}
        productId={id}
      />
    </div>
  );
}
