"use client";

import { cn } from "@site-haus/ui/lib/utils";
import { PlateElement, type PlateElementProps } from "platejs/react";

export function BlockquoteElement({ className, children, ...props }: PlateElementProps) {
  return (
    <PlateElement
      className={cn(
        "my-2 border-l-2 border-muted-foreground/30 pl-4 italic text-muted-foreground",
        className,
      )}
      as="blockquote"
      {...props}
    >
      {children}
    </PlateElement>
  );
}
