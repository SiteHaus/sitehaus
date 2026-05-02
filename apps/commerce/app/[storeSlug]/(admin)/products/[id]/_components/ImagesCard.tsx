"use client";

import {
  confirmProductImage,
  deleteProductImage,
  getImageUploadUrl,
  listProductImages,
  reorderProductImages,
  type ProductImage,
} from "@/lib/commerce";
import { Button } from "@site-haus/ui/components/base/button";
import { Card, CardContent, CardHeader, CardTitle } from "@site-haus/ui/components/base/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, ImageIcon, Loader2, Plus, Star, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type ContentType = (typeof ACCEPTED)[number];

export function ImagesCard({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const { data: images = [], isLoading } = useQuery({
    queryKey: ["product-images", productId],
    queryFn: () => listProductImages(productId),
  });

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => deleteProductImage(productId, imageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-images", productId] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Image removed");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete image"),
  });

  const reorderMutation = useMutation({
    mutationFn: (items: Array<{ imageId: string; sortOrder: number }>) =>
      reorderProductImages(productId, items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-images", productId] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: () => toast.error("Failed to reorder images"),
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = "";

    setUploading(true);
    try {
      for (const file of files) {
        if (!ACCEPTED.includes(file.type as ContentType)) {
          toast.error(`Unsupported file type: ${file.type}`);
          continue;
        }

        const { uploadUrl, r2Key } = await getImageUploadUrl(productId, file.type);

        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        if (!uploadRes.ok) {
          const text = await uploadRes.text().catch(() => "");
          throw new Error(`R2 upload failed (${uploadRes.status}): ${text}`);
        }

        await confirmProductImage(productId, r2Key);
      }
      qc.invalidateQueries({ queryKey: ["product-images", productId] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(files.length > 1 ? `${files.length} images uploaded` : "Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleDragStart(id: string) {
    setDraggingId(id);
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    setDragOverId(id);
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    const fromIdx = images.findIndex((img) => img.id === draggingId);
    const toIdx = images.findIndex((img) => img.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...images];
    const moved = reordered.splice(fromIdx, 1)[0];
    if (!moved) return;
    reordered.splice(toIdx, 0, moved);

    const items = reordered.map((img, i) => ({ imageId: img.id, sortOrder: i }));
    reorderMutation.mutate(items);

    setDraggingId(null);
    setDragOverId(null);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverId(null);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Images</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add Image
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : images.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-lg text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="size-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Click to upload images</p>
            <p className="text-xs text-muted-foreground/70 mt-1">JPEG, PNG, WebP or GIF</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {images.map((img, idx) => (
              <ImageTile
                key={img.id}
                image={img}
                isPrimary={idx === 0}
                isDragging={draggingId === img.id}
                isDragOver={dragOverId === img.id}
                onDelete={() => deleteMutation.mutate(img.id)}
                onDragStart={() => handleDragStart(img.id)}
                onDragOver={(e) => handleDragOver(e, img.id)}
                onDrop={(e) => handleDrop(e, img.id)}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        )}
        {images.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            Drag to reorder · First image is the primary image
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ImageTile({
  image,
  isPrimary,
  isDragging,
  isDragOver,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  image: ProductImage;
  isPrimary: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`relative group aspect-square rounded-md overflow-hidden border bg-muted cursor-grab select-none transition-opacity ${
        isDragging ? "opacity-40" : "opacity-100"
      } ${isDragOver ? "ring-2 ring-primary" : ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.cdnUrl}
        alt={image.altText ?? "Product image"}
        className="w-full h-full object-cover"
      />

      {isPrimary && (
        <div className="absolute top-1.5 left-1.5 bg-black/60 text-white rounded-full p-0.5">
          <Star className="size-3 fill-yellow-400 stroke-yellow-400" />
        </div>
      )}

      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onDelete}
          className="bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 transition-colors"
        >
          <X className="size-3" />
        </button>
      </div>

      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="size-4 text-white drop-shadow" />
      </div>
    </div>
  );
}
