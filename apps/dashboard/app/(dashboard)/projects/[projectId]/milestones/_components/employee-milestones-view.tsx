"use client";

import { useMilestones } from "@/hooks/use-milestones";
import type { MilestoneItem } from "@site-haus/contracts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@site-haus/ui/components/base/alert-dialog";
import { Button } from "@site-haus/ui/components/base/button";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { Milestone, Plus } from "lucide-react";
import { useState } from "react";
import { MilestoneCard } from "./milestone-card";
import { MilestoneFormSheet } from "./milestone-form-sheet";

interface EmployeeMilestonesViewProps {
  projectId: string;
}

export function EmployeeMilestonesView({
  projectId,
}: EmployeeMilestonesViewProps) {
  const { milestones, loading, create, update, remove, reorder } =
    useMilestones(projectId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MilestoneItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MilestoneItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = (
    data: Parameters<typeof create>[0],
  ): Promise<boolean> => create(data);

  const handleUpdate = (
    data: Parameters<typeof update>[1],
  ): Promise<boolean> => {
    if (!editTarget) return Promise.resolve(false);
    return update(editTarget.id, data);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    await remove(deleteTarget.id);
    setDeletingId(null);
    setDeleteTarget(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...milestones];
    [updated[index - 1], updated[index]] = [updated[index]!, updated[index - 1]!];
    reorder(updated.map((m) => m.id));
  };

  const handleMoveDown = (index: number) => {
    if (index === milestones.length - 1) return;
    const updated = [...milestones];
    [updated[index + 1], updated[index]] = [updated[index]!, updated[index + 1]!];
    reorder(updated.map((m) => m.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          Track project milestones and get sign-off on completed work.
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Milestone
        </Button>
      </div>

      {milestones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Milestone className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-base font-medium">No milestones yet</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Add the first milestone to start tracking progress.
          </p>
          <Button className="mt-4" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Milestone
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.map((m, i) => (
            <MilestoneCard
              key={m.id}
              milestone={m}
              isFirst={i === 0}
              isLast={i === milestones.length - 1}
              canManage={true}
              onEdit={() => setEditTarget(m)}
              onDelete={() => setDeleteTarget(m)}
              onMoveUp={() => handleMoveUp(i)}
              onMoveDown={() => handleMoveDown(i)}
            />
          ))}
        </div>
      )}

      <MilestoneFormSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={handleCreate}
      />

      <MilestoneFormSheet
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        milestone={editTarget}
        onSave={handleUpdate}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete milestone?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.name}&quot;.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={!!deletingId}
            >
              {deletingId && <Spinner className="size-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
