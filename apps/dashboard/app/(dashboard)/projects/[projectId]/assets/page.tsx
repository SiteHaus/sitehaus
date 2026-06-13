"use client";

import { useAuthStore } from "@site-haus/stores/auth-store";
import { Button } from "@site-haus/ui/components/base/button";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { ArrowLeft, FolderOpen } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { useAssets } from "@/hooks/use-assets";
import { AssetCard } from "./_components/asset-card";
import { AssetSheet } from "./_components/asset-sheet";
import { UploadZone } from "./_components/upload-zone";
import { PageHero } from "@site-haus/ui/components/shared/page-hero";
import { Paperclip } from "lucide-react";

export default function AssetsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const canUpload = useAuthStore((s) => s.hasPerm("assets:upload"));
  const canManage = useAuthStore((s) => s.hasPerm("assets:manage"));

  const { assets, loading, hasMore, uploadingFiles, upload, update, remove, getAsset, loadMore } =
    useAssets(projectId);

  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHero
        icon={Paperclip}
        title="Assets"
        subtitle="Files uploaded for this project."
        back={
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Project
          </Link>
        }
      />

      {canUpload && (
        <UploadZone
          onUpload={upload}
          uploadingFiles={uploadingFiles}
          disabled={uploadingFiles.length > 0}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-6 text-primary" />
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-base font-medium">No files yet</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {canUpload
              ? "Upload files using the area above."
              : "No files have been uploaded for this project yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onClick={() => setSelectedAssetId(asset.id)}
              showReviewStatus={canManage}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore}>
            Load more
          </Button>
        </div>
      )}

      <AssetSheet
        assetId={selectedAssetId}
        onClose={() => setSelectedAssetId(null)}
        onUpdate={update}
        onDelete={remove}
        getAsset={getAsset}
      />
    </div>
  );
}
