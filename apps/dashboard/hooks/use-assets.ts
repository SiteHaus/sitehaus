"use client";

import type { AssetDetail, AssetItem } from "@site-haus/contracts";
import { getApi } from "@site-haus/stores/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function useAssets(projectId: string) {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const nextCursorRef = useRef<string | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    nextCursorRef.current = undefined;
    try {
      const res = await getApi().assets.list({
        params: { projectId },
        query: {},
      });
      if (res.status === 200) {
        setAssets(res.body.assets);
        nextCursorRef.current = res.body.nextCursor;
        setHasMore(!!res.body.nextCursor);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadMore = useCallback(async () => {
    if (!nextCursorRef.current) return;
    try {
      const res = await getApi().assets.list({
        params: { projectId },
        query: { cursor: nextCursorRef.current },
      });
      if (res.status === 200) {
        setAssets((prev) => [...prev, ...res.body.assets]);
        nextCursorRef.current = res.body.nextCursor;
        setHasMore(!!res.body.nextCursor);
      }
    } catch {
      // silently fail
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = useCallback(
    async (files: File[]) => {
      setUploadingFiles(files.map((f) => f.name));
      for (const file of files) {
        try {
          const res = await getApi().assets.upload({
            params: { projectId },
            body: { file },
          });
          if (res.status === 201) {
            setAssets((prev) => [res.body.asset, ...prev]);
            toast.success(`${file.name} uploaded`);
          } else {
            toast.error(`Failed to upload ${file.name}`);
          }
        } catch {
          toast.error(`Failed to upload ${file.name}`);
        } finally {
          setUploadingFiles((prev) => prev.filter((n) => n !== file.name));
        }
      }
    },
    [projectId]
  );

  const update = useCallback(
    async (
      assetId: string,
      data: { notes?: string | null; reviewStatus?: AssetItem["reviewStatus"] }
    ) => {
      try {
        const res = await getApi().assets.update({
          params: { projectId, assetId },
          body: data,
        });
        if (res.status === 200) {
          setAssets((prev) =>
            prev.map((a) => (a.id === assetId ? res.body.asset : a))
          );
          return true;
        } else {
          toast.error("Failed to update");
        }
      } catch {
        toast.error("Something went wrong");
      }
      return false;
    },
    [projectId]
  );

  const remove = useCallback(
    async (assetId: string) => {
      try {
        const res = await getApi().assets.remove({
          params: { projectId, assetId },
        });
        if (res.status === 204) {
          setAssets((prev) => prev.filter((a) => a.id !== assetId));
          toast.success("File deleted");
          return true;
        } else {
          toast.error("Failed to delete");
        }
      } catch {
        toast.error("Something went wrong");
      }
      return false;
    },
    [projectId]
  );

  const getAsset = useCallback(
    async (assetId: string): Promise<AssetDetail | null> => {
      try {
        const res = await getApi().assets.get({
          params: { projectId, assetId },
        });
        if (res.status === 200) {
          return res.body.asset;
        }
      } catch {
        // silently fail
      }
      return null;
    },
    [projectId]
  );

  return {
    assets,
    loading,
    hasMore,
    uploadingFiles,
    load,
    loadMore,
    upload,
    update,
    remove,
    getAsset,
  };
}
