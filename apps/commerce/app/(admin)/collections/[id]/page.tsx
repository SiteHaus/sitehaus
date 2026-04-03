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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@site-haus/ui/components/base/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Package, Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
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
      // If slug changed, the detail query key is now stale — refetch with new slug
      setSlug(updated.slug);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || !collectionMeta) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const productIds = new Set(collection?.products.map((p) => p.id) ?? []);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/collections")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{collectionMeta.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {collectionMeta.productCount} product{collectionMeta.productCount !== 1 ? "s" : ""}
          </p>
        </div>
        {dirty && (
          <div className="ml-auto">
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
              {saveMutation.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        )}
      </div>

      {/* Edit form */}
      <div className="border rounded-lg p-5 space-y-4 bg-card">
        <h2 className="font-medium text-sm">Details</h2>
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

      {/* Products */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-sm">Products</h2>
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4 mr-2" />
            Add Product
          </Button>
        </div>

        {productIds.size === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border rounded-lg text-center bg-card">
            <Package className="size-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No products in this collection yet.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setAddOpen(true)}>
              <Plus className="size-4 mr-2" />
              Add Product
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
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
                    onClick={() => router.push(`/products/${p.id}`)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.id}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

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

  const { data } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => listProducts({ limit: 200 }),
    enabled: open,
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
              {data ? "No products to add" : "Loading..."}
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
