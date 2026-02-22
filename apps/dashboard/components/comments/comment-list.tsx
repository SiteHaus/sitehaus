"use client";

import type { CommentDetail } from "@site-haus/contracts";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { Badge } from "@site-haus/ui/components/base/badge";
import { Button } from "@site-haus/ui/components/base/button";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { Textarea } from "@site-haus/ui/components/base/textarea";
import { MessageSquare, Pencil, Reply, Trash2 } from "lucide-react";
import { useState } from "react";
import type { CommentThread } from "@/hooks/use-comments";

function getInitials(firstName?: string, lastName?: string) {
  return `${(firstName ?? "")[0] ?? ""}${(lastName ?? "")[0] ?? ""}`.toUpperCase() || "?";
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function CommentItem({
  comment,
  isReply = false,
  onReply,
  onEdit,
  onDelete,
}: {
  comment: CommentDetail;
  isReply?: boolean;
  onReply?: (parentId: string) => void;
  onEdit?: (commentId: string, body: string) => Promise<boolean>;
  onDelete?: (commentId: string) => Promise<boolean>;
}) {
  const user = useAuthStore((s) => s.user);
  const isEmployee = useAuthStore((s) => s.hasPerm("documents:manage"));
  const isOwn = user?.id === comment.authorId;

  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!onEdit || !editBody.trim()) return;
    setSaving(true);
    const ok = await onEdit(comment.id, editBody.trim());
    setSaving(false);
    if (ok) setEditing(false);
  };

  // Hide internal comments from non-employees
  if (comment.isInternal && !isEmployee) return null;

  return (
    <div className={`flex gap-3 ${isReply ? "ml-10" : ""}`}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
        {getInitials(comment.author?.firstName, comment.author?.lastName)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {comment.author
              ? `${comment.author.firstName} ${comment.author.lastName}`
              : "Unknown"}
          </span>
          <span className="text-xs text-muted-foreground">
            {timeAgo(comment.createdAt)}
          </span>
          {comment.isInternal && (
            <Badge variant="outline" className="text-[10px]">
              Internal
            </Badge>
          )}
        </div>

        {editing ? (
          <div className="mt-1 space-y-2">
            <Textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={2}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button size="xs" onClick={handleSave} disabled={saving}>
                Save
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setEditBody(comment.body);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 text-sm whitespace-pre-wrap">{comment.body}</p>
        )}

        {!editing && (
          <div className="mt-1 flex items-center gap-1">
            {onReply && !isReply && (
              <Button
                size="xs"
                variant="ghost"
                className="h-6 text-xs text-muted-foreground"
                onClick={() => onReply(comment.id)}
              >
                <Reply className="mr-1 h-3 w-3" />
                Reply
              </Button>
            )}
            {isOwn && onEdit && (
              <Button
                size="xs"
                variant="ghost"
                className="h-6 text-xs text-muted-foreground"
                onClick={() => setEditing(true)}
              >
                <Pencil className="mr-1 h-3 w-3" />
                Edit
              </Button>
            )}
            {isOwn && onDelete && (
              <Button
                size="xs"
                variant="ghost"
                className="h-6 text-xs text-muted-foreground"
                onClick={() => onDelete(comment.id)}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Delete
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CommentList({
  threads,
  loading,
  onReply,
  onEdit,
  onDelete,
}: {
  threads: CommentThread[];
  loading: boolean;
  onReply: (parentId: string) => void;
  onEdit: (commentId: string, body: string) => Promise<boolean>;
  onDelete: (commentId: string) => Promise<boolean>;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Spinner className="size-4 text-muted-foreground" />
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No comments yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {threads.map((thread) => (
        <div key={thread.id} className="space-y-3">
          <CommentItem
            comment={thread}
            onReply={onReply}
            onEdit={onEdit}
            onDelete={onDelete}
          />
          {thread.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              isReply
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
