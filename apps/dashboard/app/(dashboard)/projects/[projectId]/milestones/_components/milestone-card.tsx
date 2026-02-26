"use client";

import type { MilestoneItem } from "@site-haus/contracts";
import { Button } from "@site-haus/ui/components/base/button";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import {
  BadgeCheck,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
} from "lucide-react";
import { formatDate } from "@site-haus/utils/core/format";
import { MilestoneStatusBadge } from "./milestone-status-badge";

interface MilestoneCardProps {
  milestone: MilestoneItem;
  isFirst?: boolean;
  isLast?: boolean;
  canManage: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onSignOff?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  signingOff?: boolean;
}

export function MilestoneCard({
  milestone,
  isFirst,
  isLast,
  canManage,
  onEdit,
  onDelete,
  onSignOff,
  onMoveUp,
  onMoveDown,
  signingOff,
}: MilestoneCardProps) {
  const isCompleted = milestone.status === "completed";
  const isSignedOff = !!milestone.signedOffAt;

  return (
    <div className="rounded-xl border bg-card p-4 flex items-start gap-3">
      {canManage && (
        <div className="flex flex-col gap-0.5 shrink-0 pt-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={isFirst}
            onClick={onMoveUp}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={isLast}
            onClick={onMoveDown}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className="font-medium text-sm leading-tight">{milestone.name}</p>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <MilestoneStatusBadge status={milestone.status} />
          </div>
        </div>

        {milestone.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {milestone.description}
          </p>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          {milestone.dueDate && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Due {formatDate(milestone.dueDate)}
            </span>
          )}
          {milestone.completedAt && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3" />
              Completed {formatDate(milestone.completedAt)}
            </span>
          )}
          {isSignedOff && milestone.signedOffAt && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <BadgeCheck className="h-3 w-3" />
              Signed off {formatDate(milestone.signedOffAt)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {!canManage && isCompleted && !isSignedOff && onSignOff && (
          <Button
            size="sm"
            variant="outline"
            disabled={signingOff}
            onClick={onSignOff}
            className="text-xs"
          >
            {signingOff && <Spinner className="size-3 mr-1.5" />}
            Sign Off
          </Button>
        )}

        {canManage && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
