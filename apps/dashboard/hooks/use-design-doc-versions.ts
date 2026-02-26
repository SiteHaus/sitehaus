"use client";

import { getApi } from "@site-haus/stores/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export function useDesignDocVersions(projectId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.designDoc.versions(projectId);

  const { data: versions = [], isLoading: loading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const res = await getApi().designDocuments.listVersions({ params: { projectId } });
      if (res.status !== 200) return [];
      return res.body.versions;
    },
  });

  const getVersion = async (version: string) => {
    try {
      const res = await getApi().designDocuments.getVersion({
        params: { projectId, version },
      });
      if (res.status === 200) return res.body.version;
    } catch {
      // handled by caller
    }
    return null;
  };

  return {
    versions,
    loading,
    refetch: () => queryClient.invalidateQueries({ queryKey: key }),
    getVersion,
  };
}
