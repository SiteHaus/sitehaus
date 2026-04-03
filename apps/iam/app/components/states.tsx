"use client";

import { Spinner } from "@site-haus/ui/components/base/spinner";
import { cn } from "@site-haus/ui/lib/utils";
import type { LucideIcon } from "lucide-react";

interface LoadingStateProps {
  className?: string;
}

export function LoadingState({ className }: LoadingStateProps) {
  return (
    <div className={cn("flex items-center justify-center py-12", className)}>
      <Spinner className="h-6 w-6" />
    </div>
  );
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
    </div>
  );
}
