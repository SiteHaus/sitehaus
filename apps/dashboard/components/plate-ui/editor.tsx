"use client";

import { cn } from "@site-haus/ui/lib/utils";
import { PlateContent, type PlateContentProps } from "platejs/react";
import * as React from "react";

export function EditorContainer({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative w-full cursor-text overflow-y-auto rounded-b-lg border border-t-0 bg-background",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Editor({
  className,
  disabled,
  readOnly,
  ...props
}: PlateContentProps) {
  return (
    <PlateContent
      className={cn(
        "relative w-full overflow-x-hidden px-8 py-6 text-sm leading-relaxed outline-none [&_[data-slate-placeholder]]:!opacity-30",
        "min-h-[200px]",
        className
      )}
      disabled={disabled}
      readOnly={readOnly}
      {...props}
    />
  );
}
