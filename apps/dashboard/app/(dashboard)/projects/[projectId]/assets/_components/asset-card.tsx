"use client";

import type { AssetItem } from "@site-haus/contracts";
import { Badge } from "@site-haus/ui/components/base/badge";
import { File, FileText, FileType2, ImageIcon } from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType === "application/pdf") return FileText;
  if (
    mimeType.startsWith("font/") ||
    mimeType === "application/x-font-ttf" ||
    mimeType === "application/x-font-otf"
  )
    return FileType2;
  return File;
}

const reviewStatusVariant = (
  s: string
): "secondary" | "outline" | "success" | "destructive" => {
  switch (s) {
    case "reviewed":
      return "outline";
    case "approved":
      return "success";
    case "needs_replacement":
      return "destructive";
    default:
      return "secondary";
  }
};

const reviewStatusLabel = (s: string) => {
  switch (s) {
    case "pending":
      return "Pending";
    case "reviewed":
      return "Reviewed";
    case "approved":
      return "Approved";
    case "needs_replacement":
      return "Needs Replacement";
    default:
      return s;
  }
};

interface AssetCardProps {
  asset: AssetItem;
  onClick: () => void;
  showReviewStatus?: boolean;
}

export function AssetCard({ asset, onClick, showReviewStatus }: AssetCardProps) {
  const Icon = fileIcon(asset.fileType);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full"
    >
      <Icon className="h-10 w-10 text-muted-foreground/60 shrink-0" />
      <div className="w-full space-y-1 text-center">
        <p className="text-sm font-medium leading-tight truncate" title={asset.fileName}>
          {asset.fileName}
        </p>
        <p className="text-xs text-muted-foreground">{formatBytes(asset.fileSize)}</p>
      </div>
      {showReviewStatus && (
        <Badge variant={reviewStatusVariant(asset.reviewStatus)}>
          {reviewStatusLabel(asset.reviewStatus)}
        </Badge>
      )}
    </button>
  );
}
