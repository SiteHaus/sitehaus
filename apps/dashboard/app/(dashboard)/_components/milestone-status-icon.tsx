"use client";

import { Circle, Clock } from "lucide-react";

interface MilestoneStatusIconProps {
  status: string;
}

export function MilestoneStatusIcon({ status }: MilestoneStatusIconProps) {
  if (status === "in_progress") return <Clock className="h-4 w-4 shrink-0 text-warning" />;
  return <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />;
}
