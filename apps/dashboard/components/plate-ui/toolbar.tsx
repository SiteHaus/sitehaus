"use client";

import { cn } from "@site-haus/ui/lib/utils";
import * as React from "react";

export function FixedToolbar({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-t-lg border bg-background p-1",
        className,
      )}
      role="toolbar"
      {...props}
    >
      {children}
    </div>
  );
}

export function ToolbarButton({
  className,
  active,
  children,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-7 min-w-7 items-center justify-center rounded px-2 text-xs font-medium transition-colors",
        "hover:bg-muted hover:text-foreground",
        active && "bg-muted text-foreground",
        !active && "text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function ToolbarSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-1 h-5 w-px shrink-0 bg-border", className)} {...props} />;
}
