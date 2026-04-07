"use client";

import { cn } from "@site-haus/ui/lib/utils";
import { PlateElement, type PlateElementProps } from "platejs/react";

export function H1Element({ className, children, ...props }: PlateElementProps) {
  return (
    <PlateElement className={cn("mb-1 mt-6 text-3xl font-bold", className)} as="h1" {...props}>
      {children}
    </PlateElement>
  );
}

export function H2Element({ className, children, ...props }: PlateElementProps) {
  return (
    <PlateElement className={cn("mb-1 mt-5 text-2xl font-semibold", className)} as="h2" {...props}>
      {children}
    </PlateElement>
  );
}

export function H3Element({ className, children, ...props }: PlateElementProps) {
  return (
    <PlateElement className={cn("mb-1 mt-4 text-xl font-semibold", className)} as="h3" {...props}>
      {children}
    </PlateElement>
  );
}
