"use client";

import type { TicketAttachment } from "@site-haus/contracts";
import { Button } from "@site-haus/ui/components/base/button";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { formatDate } from "@site-haus/utils/core/format";
import { Download, FileText, ImageIcon, Paperclip, Trash2, Upload } from "lucide-react";
import { useRef } from "react";

type Props = {
  attachments: TicketAttachment[];
  loading: boolean;
  uploading: boolean;
  canManage: boolean;
  onUpload: (files: File[]) => void;
  onDelete: (attachmentId: string) => void;
};

function AttachmentIcon({ fileType }: { fileType: string }) {
  if (fileType.startsWith("image/")) return <ImageIcon className="h-4 w-4 shrink-0" />;
  return <FileText className="h-4 w-4 shrink-0" />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function TicketAttachments({
  attachments,
  loading,
  uploading,
  canManage,
  onUpload,
  onDelete,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onUpload(files);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onUpload(files);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Paperclip className="h-4 w-4" />
          Attachments
          {attachments.length > 0 && (
            <span className="text-muted-foreground">({attachments.length})</span>
          )}
        </div>
        <div>
          <input ref={inputRef} type="file" multiple className="hidden" onChange={handleChange} />
          <Button
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Spinner className="mr-2 h-3.5 w-3.5" />
            ) : (
              <Upload className="mr-2 h-3.5 w-3.5" />
            )}
            {uploading ? "Uploading…" : "Attach file"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Spinner className="h-4 w-4 text-muted-foreground" />
        </div>
      ) : attachments.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <Paperclip className="mb-2 h-5 w-5" />
          <p>Drop files here or click to attach</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2"
            >
              <AttachmentIcon fileType={a.fileType} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(a.fileSize)}
                  {a.createdAt && ` · ${formatDate(a.createdAt)}`}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button asChild size="icon" variant="ghost" className="h-7 w-7">
                  <a href={a.downloadUrl} download={a.fileName} target="_blank" rel="noreferrer">
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </Button>
                {canManage && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onDelete(a.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
