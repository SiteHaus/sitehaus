"use client";

import type { AssetDetail, AssetItem } from "@site-haus/contracts";
import { useAuthStore } from "@site-haus/stores/auth-store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@site-haus/ui/components/base/alert-dialog";
import { Button } from "@site-haus/ui/components/base/button";
import { FormSection } from "@site-haus/ui/components/base/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@site-haus/ui/components/base/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@site-haus/ui/components/base/sheet";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { Textarea } from "@site-haus/ui/components/base/textarea";
import { formatDate } from "@site-haus/utils/core/format";
import { Download, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AssetSheetProps {
  assetId: string | null;
  onClose: () => void;
  onUpdate: (
    id: string,
    data: { notes?: string | null; reviewStatus?: AssetItem["reviewStatus"] },
  ) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  getAsset: (id: string) => Promise<AssetDetail | null>;
}

export function AssetSheet({ assetId, onClose, onUpdate, onDelete, getAsset }: AssetSheetProps) {
  const canManage = useAuthStore((s) => s.hasPerm("assets:manage"));

  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [assetLoading, setAssetLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const fetchAsset = useCallback(
    async (id: string) => {
      setAssetLoading(true);
      const detail = await getAsset(id);
      if (detail) {
        setAsset(detail);
        setNotes(detail.notes ?? "");
      }
      setAssetLoading(false);
    },
    [getAsset],
  );

  useEffect(() => {
    if (assetId) {
      fetchAsset(assetId);
    } else {
      setAsset(null);
      setNotes("");
    }
  }, [assetId, fetchAsset]);

  const handleSaveNotes = async () => {
    if (!asset) return;
    setSavingNotes(true);
    const ok = await onUpdate(asset.id, { notes: notes || null });
    if (ok) {
      setAsset((prev) => (prev ? { ...prev, notes: notes || null } : null));
      toast.success("Notes saved");
    }
    setSavingNotes(false);
  };

  const handleStatusChange = async (value: string) => {
    if (!asset) return;
    setSavingStatus(true);
    const status = value as AssetItem["reviewStatus"];
    const ok = await onUpdate(asset.id, { reviewStatus: status });
    if (ok) {
      setAsset((prev) => (prev ? { ...prev, reviewStatus: status } : null));
    }
    setSavingStatus(false);
  };

  const handleDelete = async () => {
    if (!asset) return;
    const ok = await onDelete(asset.id);
    if (ok) onClose();
  };

  const isImage = asset?.fileType.startsWith("image/");

  return (
    <Sheet
      open={!!assetId}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="flex flex-col">
        {assetLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="size-6 text-primary" />
          </div>
        ) : asset ? (
          <>
            <SheetHeader>
              <SheetTitle className="pr-8 break-all">{asset.fileName}</SheetTitle>
              <SheetDescription>
                {asset.fileType} &middot; {formatBytes(asset.fileSize)}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
              {isImage && (
                <div className="rounded-lg border overflow-hidden bg-muted/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.downloadUrl}
                    alt={asset.fileName}
                    className="w-full max-h-48 object-contain"
                  />
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(asset.downloadUrl, "_blank")}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>

              <p className="text-xs text-muted-foreground">
                Uploaded by{" "}
                {asset.uploader
                  ? `${asset.uploader.firstName} ${asset.uploader.lastName}`
                  : "Unknown"}{" "}
                on {formatDate(asset.createdAt) ?? "Unknown date"}
              </p>

              <FormSection>Notes</FormSection>

              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this file..."
                className="resize-none"
                rows={3}
              />
              <Button size="sm" variant="outline" disabled={savingNotes} onClick={handleSaveNotes}>
                {savingNotes && <Spinner className="size-4 mr-2" />}
                Save Notes
              </Button>

              {canManage && (
                <>
                  <FormSection>Review Status</FormSection>
                  <Select
                    value={asset.reviewStatus}
                    onValueChange={handleStatusChange}
                    disabled={savingStatus}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="needs_replacement">Needs Replacement</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>

            {canManage && (
              <SheetFooter>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete File
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete file?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete &quot;{asset.fileName}&quot;. This action
                        cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" onClick={handleDelete}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </SheetFooter>
            )}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
