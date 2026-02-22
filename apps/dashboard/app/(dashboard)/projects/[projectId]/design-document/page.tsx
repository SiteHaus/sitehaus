"use client";

import { useAuthStore } from "@site-haus/stores/auth-store";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@site-haus/ui/components/base/card";
import { Separator } from "@site-haus/ui/components/base/separator";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { ArrowLeft, Check, FileText, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { CommentForm } from "@/components/comments/comment-form";
import { CommentList } from "@/components/comments/comment-list";
import { DesignDocStatusBadge } from "@/components/design-document/status-badge";
import { PublishDialog } from "@/components/design-document/publish-dialog";
import { StatusActions } from "@/components/design-document/status-actions";
import { VersionHistory } from "@/components/design-document/version-history";
import { PlateEditor } from "@/components/plate-ui/plate-editor";
import { useComments } from "@/hooks/use-comments";
import { useDesignDocVersions } from "@/hooks/use-design-doc-versions";
import { useDesignDocument } from "@/hooks/use-design-document";

export default function DesignDocumentPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const isEmployee = useAuthStore((s) => s.hasPerm("documents:manage"));

  const {
    document: doc,
    loading,
    notFound,
    createDocument,
    updateContent,
    publishVersion,
    transitionStatus,
  } = useDesignDocument(projectId);

  const { versions, loading: versionsLoading, refetch: refetchVersions } =
    useDesignDocVersions(projectId);

  const {
    threads,
    loading: commentsLoading,
    addComment,
    updateComment,
    removeComment,
  } = useComments("design_document", doc?.id ?? "");

  // Auto-save
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef<string | null>(null);

  const isEditable =
    isEmployee && doc && (doc.status === "draft" || doc.status === "amended");

  const handleEditorChange = useCallback(
    (serialized: string) => {
      if (!isEditable) return;
      latestContentRef.current = serialized;
      setSaveStatus("idle");

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        const content = latestContentRef.current;
        if (!content) return;
        setSaveStatus("saving");
        const ok = await updateContent(content);
        setSaveStatus(ok ? "saved" : "idle");
      }, 2000);
    },
    [isEditable, updateContent]
  );

  // Manual save
  const handleManualSave = useCallback(async () => {
    const content = latestContentRef.current;
    if (!content) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    const ok = await updateContent(content);
    setSaveStatus(ok ? "saved" : "idle");
  }, [updateContent]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Reply state
  const [replyTo, setReplyTo] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  // No document yet
  if (notFound || !doc) {
    if (isEmployee) {
      return (
        <div className="space-y-4">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/projects/${projectId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Project
            </Link>
          </Button>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium">No Design Document Yet</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Create a design document to outline the project vision and get
              client approval.
            </p>
            <Button className="mt-4" onClick={() => createDocument()}>
              <Plus className="mr-2 h-4 w-4" />
              Create Design Document
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/projects/${projectId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Project
          </Link>
        </Button>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-medium">Design Document</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            The design document hasn&apos;t been created yet. Check back soon!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/projects/${projectId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Project
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Design Document</h1>
          <DesignDocStatusBadge status={doc.status} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isEditable && (
            <>
              <span className="text-xs text-muted-foreground">
                {saveStatus === "saving" && "Saving..."}
                {saveStatus === "saved" && (
                  <span className="flex items-center gap-1">
                    <Check className="h-3 w-3" /> Saved
                  </span>
                )}
              </span>
              <Button size="sm" variant="ghost" onClick={handleManualSave}>
                Save
              </Button>
              <PublishDialog
                onPublish={async (note) => {
                  // Save first, then publish
                  if (latestContentRef.current) {
                    await updateContent(latestContentRef.current);
                  }
                  const ok = await publishVersion(note);
                  if (ok) refetchVersions();
                  return ok;
                }}
              />
            </>
          )}
          <StatusActions status={doc.status} onTransition={transitionStatus} />
        </div>
      </div>

      {/* Editor */}
      <Card>
        <CardContent className="p-0">
          <PlateEditor
            initialContent={doc.content}
            onChange={isEditable ? handleEditorChange : undefined}
            readOnly={!isEditable}
          />
        </CardContent>
      </Card>

      {/* Version History */}
      <VersionHistory
        projectId={projectId}
        versions={versions}
        loading={versionsLoading}
      />

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CommentList
            threads={threads}
            loading={commentsLoading}
            onReply={(parentId) => setReplyTo(parentId)}
            onEdit={updateComment}
            onDelete={removeComment}
          />

          {replyTo && (
            <div className="ml-10">
              <p className="mb-1 text-xs text-muted-foreground">Replying...</p>
              <CommentForm
                parentId={replyTo}
                onSubmit={addComment}
                onCancel={() => setReplyTo(null)}
                placeholder="Write a reply..."
              />
            </div>
          )}

          <Separator />

          <CommentForm
            onSubmit={addComment}
            placeholder="Write a comment..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
