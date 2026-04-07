"use client";

import { RequireAuth } from "@/lib/require-auth";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { cn } from "@site-haus/ui/lib/utils";
import { Suspense } from "react";

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
  container: "container",
} as const;

interface ConsolePageWrapperProps {
  children: React.ReactNode;
  maxWidth?: keyof typeof maxWidthClasses;
  className?: string;
  requireAuth?: boolean;
}

export function ConsolePageWrapper({
  children,
  maxWidth = "4xl",
  className,
  requireAuth = true,
}: ConsolePageWrapperProps) {
  const content = (
    <div className={cn("container mx-auto mt-12", maxWidthClasses[maxWidth], className)}>
      {children}
    </div>
  );

  const wrappedContent = requireAuth ? <RequireAuth>{content}</RequireAuth> : content;

  return (
    <Suspense
      fallback={
        <div className="container mx-auto mt-12">
          <Spinner className="h-6 w-6" />
        </div>
      }
    >
      {wrappedContent}
    </Suspense>
  );
}
