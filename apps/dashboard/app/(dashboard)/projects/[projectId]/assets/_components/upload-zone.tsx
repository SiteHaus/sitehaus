"use client";

import { Spinner } from "@site-haus/ui/components/base/spinner";
import { Upload } from "lucide-react";
import { useRef, useState } from "react";

const ACCEPTED =
  "image/*,application/pdf,font/*,.ttf,.otf,.woff,.woff2,.psd,.ai,.fig,.sketch,application/msword,application/vnd.openxmlformats-officedocument.*";

interface UploadZoneProps {
  onUpload: (files: File[]) => void;
  uploadingFiles: string[];
  disabled?: boolean;
}

export function UploadZone({ onUpload, uploadingFiles, disabled }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0 || disabled) return;
    onUpload(Array.from(files));
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={[
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/20 hover:bg-muted/40",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        ].join(" ")}
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Drag files here or click to browse</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Images, PDFs, fonts, design files, and documents
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
        />
      </div>

      {uploadingFiles.length > 0 && (
        <ul className="space-y-1">
          {uploadingFiles.map((name) => (
            <li key={name} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Spinner className="size-3 shrink-0" />
              <span className="truncate">{name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
