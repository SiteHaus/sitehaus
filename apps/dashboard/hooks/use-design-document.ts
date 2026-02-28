"use client";

import type { DesignDocumentItem } from "@site-haus/contracts";
import { getApi } from "@site-haus/stores/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";

export function useDesignDocument(projectId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.designDoc.detail(projectId);

  const {
    data,
    isLoading: loading,
  } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const res = await getApi().designDocuments.get({ params: { projectId } });
      if (res.status === 200) return { document: res.body.document, notFound: false };
      if (res.status === 404) return { document: null, notFound: true };
      throw new Error("Failed to load design document");
    },
  });

  const document = data?.document ?? null;
  const notFound = data?.notFound ?? false;

  const setDoc = (doc: DesignDocumentItem | null) => {
    queryClient.setQueryData<typeof data>(key, { document: doc, notFound: doc === null });
  };

  const createMutation = useMutation({
    mutationFn: (content?: string) =>
      getApi().designDocuments.create({ params: { projectId }, body: { content } }),
    onSuccess: (res) => {
      if (res.status === 201) {
        setDoc(res.body.document);
        toast.success("Design document created");
      } else {
        toast.error("Failed to create design document");
      }
    },
    onError: () => toast.error("Something went wrong"),
  });

  const updateContentMutation = useMutation({
    mutationFn: (content: string) =>
      getApi().designDocuments.update({ params: { projectId }, body: { content } }),
    onSuccess: (res) => {
      if (res.status === 200) {
        setDoc(res.body.document);
      } else {
        toast.error("Failed to save");
      }
    },
    onError: () => toast.error("Something went wrong"),
  });

  const publishVersionMutation = useMutation({
    mutationFn: (changeNote?: string) =>
      getApi().designDocuments.publish({ params: { projectId }, body: { changeNote } }),
    onSuccess: (res) => {
      if (res.status === 200) {
        setDoc(res.body.document);
        toast.success("Version published");
      } else {
        toast.error("Failed to publish version");
      }
    },
    onError: () => toast.error("Something went wrong"),
  });

  const transitionStatusMutation = useMutation({
    mutationFn: (status: "draft" | "in_review" | "approved" | "amended") =>
      getApi().designDocuments.transitionStatus({ params: { projectId }, body: { status } }),
    onSuccess: (res) => {
      if (res.status === 200) {
        setDoc(res.body.document);
        toast.success(`Status updated to ${res.body.document.status.replace("_", " ")}`);
      } else {
        toast.error("Failed to update status");
      }
    },
    onError: () => toast.error("Something went wrong"),
  });

  return {
    document,
    loading,
    notFound,
    refetch: () => queryClient.invalidateQueries({ queryKey: key }),
    createDocument: (content?: string) =>
      createMutation.mutateAsync(content).then((r) =>
        r.status === 201 ? r.body.document : null
      ),
    updateContent: (content: string) =>
      updateContentMutation.mutateAsync(content).then((r) => r.status === 200),
    publishVersion: (changeNote?: string) =>
      publishVersionMutation.mutateAsync(changeNote).then((r) => r.status === 200),
    transitionStatus: (status: "draft" | "in_review" | "approved" | "amended") =>
      transitionStatusMutation.mutateAsync(status).then((r) => r.status === 200),
  };
}
