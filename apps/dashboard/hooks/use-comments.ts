"use client";

import type { CommentDetail } from "@site-haus/contracts";
import { getApi } from "@site-haus/stores/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";

type TargetType = "ticket" | "design_document" | "project";

export type CommentThread = CommentDetail & {
  replies: CommentDetail[];
};

function buildThreads(comments: CommentDetail[]): CommentThread[] {
  const topLevel: CommentThread[] = [];
  const repliesByParent = new Map<string, CommentDetail[]>();

  for (const c of comments) {
    if (c.parentId) {
      const existing = repliesByParent.get(c.parentId) ?? [];
      existing.push(c);
      repliesByParent.set(c.parentId, existing);
    } else {
      topLevel.push({ ...c, replies: [] });
    }
  }

  for (const thread of topLevel) {
    thread.replies = repliesByParent.get(thread.id) ?? [];
  }

  return topLevel;
}

export function useComments(targetType: TargetType, targetId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.comments.list(targetType, targetId);

  const { data: comments = [], isLoading: loading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!targetId) return [];
      const res = await getApi().comments.list({ query: { targetType, targetId } });
      if (res.status !== 200) throw new Error("Failed to load comments");
      return res.body.comments;
    },
    enabled: !!targetId,
  });

  const threads = buildThreads(comments);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const addMutation = useMutation({
    mutationFn: (opts: { body: string; isInternal?: boolean; parentId?: string }) =>
      getApi().comments.create({
        body: {
          targetType,
          targetId,
          body: opts.body,
          isInternal: opts.isInternal,
          parentId: opts.parentId,
        },
      }),
    onSuccess: (res) => {
      if (res.status === 201) {
        void invalidate();
      } else {
        toast.error("Failed to add comment");
      }
    },
    onError: () => toast.error("Something went wrong"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ commentId, body }: { commentId: string; body: string }) =>
      getApi().comments.update({ params: { commentId }, body: { body } }),
    onSuccess: (res) => {
      if (res.status === 200) {
        void invalidate();
      } else {
        toast.error("Failed to update comment");
      }
    },
    onError: () => toast.error("Something went wrong"),
  });

  const removeMutation = useMutation({
    mutationFn: (commentId: string) => getApi().comments.remove({ params: { commentId } }),
    onSuccess: (res) => {
      if (res.status === 204) {
        void invalidate();
        toast.success("Comment deleted");
      } else {
        toast.error("Failed to delete comment");
      }
    },
    onError: () => toast.error("Something went wrong"),
  });

  return {
    comments,
    threads,
    loading,
    refetch: invalidate,
    addComment: (body: string, opts?: { isInternal?: boolean; parentId?: string }) =>
      addMutation.mutateAsync({ body, ...opts }).then((r) => r.status === 201),
    updateComment: (commentId: string, body: string) =>
      updateMutation.mutateAsync({ commentId, body }).then((r) => r.status === 200),
    removeComment: (commentId: string) =>
      removeMutation.mutateAsync(commentId).then((r) => r.status === 204),
  };
}
