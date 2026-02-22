"use client";

import type { DesignDocumentVersionItem } from "@site-haus/contracts";
import { getApi } from "@site-haus/stores/api";
import { useCallback, useEffect, useState } from "react";

export function useDesignDocVersions(projectId: string) {
  const [versions, setVersions] = useState<DesignDocumentVersionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getApi().designDocuments.listVersions({
        params: { projectId },
      });
      if (res.status === 200) {
        setVersions(res.body.versions);
      }
    } catch {
      // silently fail — versions are supplemental
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const getVersion = useCallback(
    async (version: string) => {
      try {
        const res = await getApi().designDocuments.getVersion({
          params: { projectId, version },
        });
        if (res.status === 200) {
          return res.body.version;
        }
      } catch {
        // handled by caller
      }
      return null;
    },
    [projectId]
  );

  return { versions, loading, refetch: fetch, getVersion };
}
