"use client";

import {
  addProductToCollection,
  getCollection,
  listCollections,
  listProducts,
  updateCollection,
  type CollectionDetail,
  type CollectionItem,
  type ProductItem,
} from "@/lib/commerce";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useStoreNav } from "@/lib/use-store-nav";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@site-haus/ui/components/base/dialog";
import { Input } from "@site-haus/ui/components/base/input";
import { Label } from "@site-haus/ui/components/base/label";
import { Skeleton } from "@site-haus/ui/components/base/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@site-haus/ui/components/base/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Loader2, Package, Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { push } = useStoreNav();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  // We need the slug to call getCollection — fetch from the list
  const { data: listData } = useQuery({
    queryKey: ["collections"],
    queryFn: listCollections,
  });

  const collectionMeta = listData?.collections.find((c) => c.id === id);

  const { data: collection, isLoading } = useQuery<CollectionDetail>({
    queryKey: ["collection", id],
    queryFn: () => getCollection(collectionMeta!.slug),
    enabled: !!collectionMeta,
  });

  // Edit form
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!collectionMeta) return;
    setName(collectionMeta.name);
    setSlug(collectionMeta.slug);
    setDescription(collectionMeta.description ?? "");
  }, [collectionMeta]);

  const saveMutation = useMutation({
    mutationFn: (body: Parameters<typeof updateCollection>[1]) => updateCollection(id, body),
    onSuccess: (updated: CollectionItem) => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["collection", id] });
      setDirty(false);
      toast.success("Collection saved");
      setSlug(updated.slug);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || !collectionMeta) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  const productIds = new Set(collection?.products.map((p) => p.id) ?? []);
  const productCountLabel = `${collectionMeta.productCount} product${collectionMeta.productCount !== 1 ? "s" : ""}`;
  const statusBadge = collectionMeta.scheduled ? (
    <StatusBadge
      tone="info"
      label={
        collectionMeta.goesLiveAt
          ? new Date(collectionMeta.goesLiveAt).toLocaleDateString()
          : "Scheduled"
      }
    />
  ) : (
    <StatusBadge tone="success" label="Active" />
  );

  return (
    <div>
      <PageHeader
        eyebrow="Collections"
        title={collectionMeta.name}
        subtitle={productCountLabel}
        aside={statusBadge}
        actions={
          <>
            <Button variant="ghost" onClick={() => push("/collections")}>
              <ChevronLeft className="size-4" />
              Collections
            </Button>
            {dirty && (
              <Button
                onClick={() =>
                  saveMutation.mutate({
                    name: name || undefined,
                    slug: slug || undefined,
                    description: description || undefined,
                  })
                }
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                Save
              </Button>
            )}
          </>
        }
      />

      <div className="max-w-2xl space-y-4">
        {/* Details */}
        <SectionCard title="Details">
          <div className="space-y-4">
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setDirty(true);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Description</Label>
              <Input
                id="desc"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setDirty(true);
                }}
                placeholder="Optional description"
              />
            </div>
          </div>
        </SectionCard>

        {/* Products */}
        <SectionCard
          title="Products"
          actions={
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              Add Product
            </Button>
          }
          contentClassName={productIds.size > 0 ? "p-0" : undefined}
        >
          {productIds.size === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="size-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No products in this collection yet.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setAddOpen(true)}>
                <Plus className="size-4" />
                Add Product
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collection?.products.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() => push(`/products/${p.id}`)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.id}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SectionCard>
      </div>

      {addOpen && (
        <AddProductDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          existingProductIds={productIds}
          onAdd={(productId) => {
            addProductToCollection(id, productId)
              .then(() => {
                queryClient.invalidateQueries({ queryKey: ["collections"] });
                queryClient.invalidateQueries({ queryKey: ["collection", id] });
                toast.success("Product added");
                setAddOpen(false);
              })
              .catch((err: Error) => toast.error(err.message));
          }}
        />
      )}
    </div>
  );
}

function AddProductDialog({
  open,
  onOpenChange,
  existingProductIds,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existingProductIds: Set<string>;
  onAdd: (productId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string | null>(null);

  const { data, isError } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => listProducts({ limit: 100 }),
  });

  const filtered = (data?.items ?? []).filter(
    (p) => !existingProductIds.has(p.id) && p.name.toLowerCase().includes(search.toLowerCase()),
  );

  function handleAdd(productId: string) {
    setAdding(productId);
    onAdd(productId);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-72 overflow-y-auto space-y-1 -mx-1 px-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {isError ? "Failed to load products." : data ? "No products to add." : "Loading..."}
            </p>
          ) : (
            filtered.map((p: ProductItem) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50"
              >
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{p.status}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAdd(p.id)}
                  disabled={adding === p.id}
                >
                  {adding === p.id ? <Loader2 className="size-3 animate-spin" /> : "Add"}
                </Button>
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
