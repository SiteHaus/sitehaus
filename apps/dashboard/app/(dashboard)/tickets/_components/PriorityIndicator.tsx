"use client";

import { label } from "@site-haus/utils/core/format";

function getPriorityColor(priority: string): string {
  switch (priority.toLowerCase()) {
    case "urgent":
      return "bg-red-500";
    case "high":
      return "bg-orange-500";
    case "normal":
      return "bg-green-500";
    case "low":
      return "bg-slate-400";
    default:
      return "bg-slate-400";
  }
}

export function PriorityIndicator({ priority }: { priority: string }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className={`h-2.5 w-2.5 rounded-full ${getPriorityColor(priority)}`}
      />
      {label(priority)}
    </span>
  );
}
