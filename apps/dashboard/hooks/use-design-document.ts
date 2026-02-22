"use client";

import type { DesignDocumentItem } from "@site-haus/contracts";
import { getApi } from "@site-haus/stores/api";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function useDesignDocument(projectId: string) {
  const [document, setDocument] = useState<DesignDocumentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await getApi().designDocuments.get({
        params: { projectId },
      });
      if (res.status === 200) {
        setDocument(res.body.document);
      } else if (res.status === 404) {
        setNotFound(true);
        setDocument(null);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const createDocument = useCallback(
    async (content?: string) => {
      try {
        const res = await getApi().designDocuments.create({
          params: { projectId },
          body: { content },
        });
        if (res.status === 201) {
          setDocument(res.body.document);
          setNotFound(false);
          toast.success("Design document created");
          return res.body.document;
        } else {
          toast.error("Failed to create design document");
        }
      } catch {
        toast.error("Something went wrong");
      }
      return null;
    },
    [projectId]
  );

  const updateContent = useCallback(
    async (content: string) => {
      try {
        const res = await getApi().designDocuments.update({
          params: { projectId },
          body: { content },
        });
        if (res.status === 200) {
          setDocument(res.body.document);
          return true;
        } else {
          toast.error("Failed to save");
        }
      } catch {
        toast.error("Something went wrong");
      }
      return false;
    },
    [projectId]
  );

  const publishVersion = useCallback(
    async (changeNote?: string) => {
      try {
        const res = await getApi().designDocuments.publish({
          params: { projectId },
          body: { changeNote },
        });
        if (res.status === 200) {
          setDocument(res.body.document);
          toast.success("Version published");
          return true;
        } else {
          toast.error("Failed to publish version");
        }
      } catch {
        toast.error("Something went wrong");
      }
      return false;
    },
    [projectId]
  );

  const transitionStatus = useCallback(
    async (status: "draft" | "in_review" | "approved" | "amended") => {
      try {
        const res = await getApi().designDocuments.transitionStatus({
          params: { projectId },
          body: { status },
        });
        if (res.status === 200) {
          setDocument(res.body.document);
          toast.success(`Status updated to ${status.replace("_", " ")}`);
          return true;
        } else {
          toast.error("Failed to update status");
        }
      } catch {
        toast.error("Something went wrong");
      }
      return false;
    },
    [projectId]
  );

  return {
    document,
    loading,
    notFound,
    refetch: fetch,
    createDocument,
    updateContent,
    publishVersion,
    transitionStatus,
  };
}
