"use client";

import {
  createCollection,
  deleteCollection,
  listCollections,
  type CollectionItem,
} from "@/lib/commerce";
import { useStoreNav } from "@/lib/use-store-nav";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { StatusBadge } from "@/components/ui/status-badge";
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
import { TableCell } from "@site-haus/ui/components/base/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function CollectionsPage() {
  const { push } = useStoreNav();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: listCollections,
  });

  const collections = data?.collections ?? [];

  const deleteMutation = useMutation({
    mutationFn: deleteCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      setDeletingId(null);
      toast.success("Collection deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div>
      <PageHeader
        title="Collections"
        subtitle={
          isLoading ? "—" : `${collections.length} collection${collections.length !== 1 ? "s" : ""}`
        }
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New Collection
          </Button>
        }
      />

      <DataTableShell
        columns={[
          { header: "Name" },
          { header: "Slug" },
          { header: "Products" },
          { header: "Status" },
          { header: "", className: "w-12" },
        ]}
        rows={collections}
        getRowKey={(col) => col.id}
        isLoading={isLoading}
        onRowClick={(col) => push(`/collections/${col.id}`)}
        empty={{
          icon: Layers,
          title: "No collections yet",
          description: "Create your first collection to group products together.",
          action: (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              New Collection
            </Button>
          ),
        }}
        renderRow={(col) => (
          <>
            <TableCell className="font-medium">{col.name}</TableCell>
            <TableCell className="text-muted-foreground font-mono text-sm">{col.slug}</TableCell>
            <TableCell>{col.productCount}</TableCell>
            <TableCell>
              {col.scheduled ? (
                <StatusBadge
                  tone="info"
                  label={
                    col.goesLiveAt ? new Date(col.goesLiveAt).toLocaleDateString() : "Scheduled"
                  }
                />
              ) : (
                <StatusBadge tone="success" label="Active" />
              )}
            </TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                onClick={() => setDeletingId(col.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </TableCell>
          </>
        )}
      />

      <CreateCollectionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(col) => {
          queryClient.invalidateQueries({ queryKey: ["collections"] });
          push(`/collections/${col.id}`);
        }}
      />

      <DeleteDialog
        open={deletingId !== null}
        onOpenChange={(v) => {
          if (!v) setDeletingId(null);
        }}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

function CreateCollectionDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (col: CollectionItem) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: createCollection,
    onSuccess: (col) => {
      onCreated(col);
      onOpenChange(false);
      setName("");
      setSlug("");
      setDescription("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleNameChange(val: string) {
    setName(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Collection</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="col-name">Name</Label>
            <Input
              id="col-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Summer Essentials"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="col-slug">Slug</Label>
            <Input
              id="col-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="summer-essentials"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="col-desc">Description</Label>
            <Input
              id="col-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate({ name, slug, description: description || undefined })}
            disabled={!name || !slug || mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete collection?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This will permanently delete the collection. Products will not be affected.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
