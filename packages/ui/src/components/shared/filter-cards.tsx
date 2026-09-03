"use client";

import { StatCard } from "@site-haus/ui/components/base/stat-card";
import { cn } from "@site-haus/ui/lib/utils";
import type { Tone } from "@site-haus/ui/components/shared/status-tone";

const TONE_VAR: Record<Tone, string> = {
  active: "var(--chart-1)",
  success: "var(--chart-2)",
  info: "var(--chart-3)",
  warning: "var(--chart-5)",
  danger: "var(--chart-4)",
  neutral: "var(--muted-foreground)",
};

export type FilterItem<K extends string> = {
  key: K;
  label: string;
  count?: number;
  tone?: Tone;
  alert?: boolean;
};

export function FilterCards<K extends string>({
  items,
  active,
  onSelect,
  className,
}: {
  items: FilterItem<K>[];
  active: K;
  onSelect: (key: K) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6", className)}>
      {items.map((it) => (
        <StatCard
          key={it.key}
          label={it.label}
          value={it.count ?? "—"}
          dotColor={it.tone ? TONE_VAR[it.tone] : undefined}
          alert={it.alert}
          active={active === it.key}
          onClick={() => onSelect(it.key)}
        />
      ))}
    </div>
  );
}
