"use client";

import * as React from "react";
import { cn } from "@site-haus/ui/lib/utils";

export type StatCardProps = {
  label: string;
  value: React.ReactNode;
  dotColor?: string;
  active?: boolean;
  alert?: boolean;
  onClick?: () => void;
  className?: string;
};

export function StatCard({
  label,
  value,
  dotColor,
  active,
  alert,
  onClick,
  className,
}: StatCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active ? "" : undefined}
      className={cn(
        "flex flex-1 flex-col items-start rounded-xl border bg-card px-4 py-3 text-left ring-1 ring-foreground/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        !active && "border-border/60",
        active && "border-primary/70 bg-primary/5 ring-primary/30",
        alert && "border-primary/40",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase",
          alert && "text-primary",
        )}
      >
        {dotColor && (
          <span className="size-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
        )}
        {label}
      </span>
      <span
        className="mt-1.5 text-2xl font-medium tabular-nums text-foreground"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </span>
    </button>
  );
}
