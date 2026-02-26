"use client";

import type { AssetDetail, AssetItem } from "@site-haus/contracts";
import { getApi } from "@site-haus/stores/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";

export function useAssets(projectId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.assets.list(projectId);

  const { data, isLoading: loading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const res = await getApi().assets.list({ params: { projectId }, query: {} });
      if (res.status !== 200) throw new Error("Failed to load assets");
      return { assets: res.body.assets, nextCursor: res.body.nextCursor };
    },
  });

  const assets = data?.assets ?? [];
  const nextCursor = data?.nextCursor;
  const hasMore = !!nextCursor;

  const loadMore = async () => {
    if (!nextCursor) return;
    try {
      const res = await getApi().assets.list({
        params: { projectId },
        query: { cursor: nextCursor },
      });
      if (res.status === 200) {
        queryClient.setQueryData<typeof data>(key, (prev) => ({
          assets: [...(prev?.assets ?? []), ...res.body.assets],
          nextCursor: res.body.nextCursor,
        }));
      }
    } catch {
      // silently fail
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const uploaded: AssetItem[] = [];
      for (const file of files) {
        const res = await getApi().assets.upload({
          params: { projectId },
          body: { file },
        });
        if (res.status === 201) {
          uploaded.push(res.body.asset);
          toast.success(`${file.name} uploaded`);
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }
      }
      return uploaded;
    },
    onSuccess: (uploaded) => {
      if (uploaded.length > 0) {
        queryClient.setQueryData<typeof data>(key, (prev) => ({
          assets: [...uploaded, ...(prev?.assets ?? [])],
          nextCursor: prev?.nextCursor,
        }));
      }
    },
    onError: () => toast.error("Upload failed"),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      assetId,
      data: updateData,
    }: {
      assetId: string;
      data: { notes?: string | null; reviewStatus?: AssetItem["reviewStatus"] };
    }) =>
      getApi().assets.update({
        params: { projectId, assetId },
        body: updateData,
      }),
    onSuccess: (res) => {
      if (res.status === 200) {
        queryClient.setQueryData<typeof data>(key, (prev) => ({
          assets: (prev?.assets ?? []).map((a) =>
            a.id === res.body.asset.id ? res.body.asset : a
          ),
          nextCursor: prev?.nextCursor,
        }));
      } else {
        toast.error("Failed to update");
      }
    },
    onError: () => toast.error("Something went wrong"),
  });

  const removeMutation = useMutation({
    mutationFn: (assetId: string) =>
      getApi().assets.remove({ params: { projectId, assetId } }),
    onSuccess: (res, assetId) => {
      if (res.status === 204) {
        queryClient.setQueryData<typeof data>(key, (prev) => ({
          assets: (prev?.assets ?? []).filter((a) => a.id !== assetId),
          nextCursor: prev?.nextCursor,
        }));
        toast.success("File deleted");
      } else {
        toast.error("Failed to delete");
      }
    },
    onError: () => toast.error("Something went wrong"),
  });

  const getAsset = async (assetId: string): Promise<AssetDetail | null> => {
    try {
      const res = await getApi().assets.get({ params: { projectId, assetId } });
      if (res.status === 200) return res.body.asset;
    } catch {
      // silently fail
    }
    return null;
  };

  return {
    assets,
    loading,
    hasMore,
    uploadingFiles: uploadMutation.isPending
      ? (uploadMutation.variables as File[]).map((f) => f.name)
      : [],
    load: () => queryClient.invalidateQueries({ queryKey: key }),
    loadMore,
    upload: (files: File[]) => uploadMutation.mutateAsync(files),
    update: (assetId: string, updateData: Parameters<typeof updateMutation.mutateAsync>[0]["data"]) =>
      updateMutation.mutateAsync({ assetId, data: updateData }).then((r) => r.status === 200),
    remove: (assetId: string) =>
      removeMutation.mutateAsync(assetId).then((r) => r.status === 204),
    getAsset,
  };
}
