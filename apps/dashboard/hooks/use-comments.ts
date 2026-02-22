"use client";

import type { CommentDetail } from "@site-haus/contracts";
import { getApi } from "@site-haus/stores/api";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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
  const [comments, setComments] = useState<CommentDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!targetId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getApi().comments.list({
        query: { targetType, targetId },
      });
      if (res.status === 200) {
        setComments(res.body.comments);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const threads = buildThreads(comments);

  const addComment = useCallback(
    async (body: string, opts?: { isInternal?: boolean; parentId?: string }) => {
      if (!targetId) return false;
      try {
        const res = await getApi().comments.create({
          body: {
            targetType,
            targetId,
            body,
            isInternal: opts?.isInternal,
            parentId: opts?.parentId,
          },
        });
        if (res.status === 201) {
          await fetch();
          return true;
        } else {
          toast.error("Failed to add comment");
        }
      } catch {
        toast.error("Something went wrong");
      }
      return false;
    },
    [targetType, targetId, fetch]
  );

  const updateComment = useCallback(
    async (commentId: string, body: string) => {
      try {
        const res = await getApi().comments.update({
          params: { commentId },
          body: { body },
        });
        if (res.status === 200) {
          await fetch();
          return true;
        } else {
          toast.error("Failed to update comment");
        }
      } catch {
        toast.error("Something went wrong");
      }
      return false;
    },
    [fetch]
  );

  const removeComment = useCallback(
    async (commentId: string) => {
      try {
        const res = await getApi().comments.remove({
          params: { commentId },
        });
        if (res.status === 204) {
          await fetch();
          toast.success("Comment deleted");
          return true;
        } else {
          toast.error("Failed to delete comment");
        }
      } catch {
        toast.error("Something went wrong");
      }
      return false;
    },
    [fetch]
  );

  return {
    comments,
    threads,
    loading,
    refetch: fetch,
    addComment,
    updateComment,
    removeComment,
  };
}
