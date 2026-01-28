"use client";

import { cn } from "@site-haus/ui/lib/utils";

interface PageHeaderProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-8 flex items-start justify-between", className)}>
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-lg text-muted-foreground tracking-wide">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
