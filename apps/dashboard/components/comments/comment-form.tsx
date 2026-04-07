"use client";

import { useAuthStore } from "@site-haus/stores/auth-store";
import { Button } from "@site-haus/ui/components/base/button";
import { Textarea } from "@site-haus/ui/components/base/textarea";
import { Send } from "lucide-react";
import { useState } from "react";

export function CommentForm({
  parentId,
  onSubmit,
  onCancel,
  placeholder = "Write a comment...",
}: {
  parentId?: string;
  onSubmit: (body: string, opts?: { isInternal?: boolean; parentId?: string }) => Promise<boolean>;
  onCancel?: () => void;
  placeholder?: string;
}) {
  const isEmployee = useAuthStore((s) => s.hasPerm("documents:manage"));
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!body.trim()) return;
    setSubmitting(true);
    const ok = await onSubmit(body.trim(), {
      isInternal: isInternal || undefined,
      parentId,
    });
    setSubmitting(false);
    if (ok) {
      setBody("");
      setIsInternal(false);
    }
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />
      <div className="flex items-center justify-between">
        <div>
          {isEmployee && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded"
              />
              Internal note (only visible to team)
            </label>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button size="sm" onClick={handleSubmit} disabled={!body.trim() || submitting}>
            <Send className="mr-2 h-3.5 w-3.5" />
            {submitting ? "Sending..." : "Comment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
