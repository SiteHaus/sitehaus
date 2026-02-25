"use client";

import type { MilestoneItem } from "@site-haus/contracts";
import { useAuthStore } from "@site-haus/stores/auth-store";
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
import { ArrowLeft, Milestone, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { useMilestones } from "@/hooks/use-milestones";
import { MilestoneCard } from "./_components/milestone-card";
import { MilestoneFormSheet } from "./_components/milestone-form-sheet";

export default function MilestonesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const canManage = useAuthStore((s) => s.hasPerm("projects:manage"));

  const { milestones, loading, create, update, remove, signOff, reorder } =
    useMilestones(projectId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MilestoneItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MilestoneItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [signingOffId, setSigningOffId] = useState<string | null>(null);

  const handleCreate = async (
    data: Parameters<typeof create>[0]
  ): Promise<boolean> => {
    return create(data);
  };

  const handleUpdate = async (
    data: Parameters<typeof update>[1]
  ): Promise<boolean> => {
    if (!editTarget) return false;
    return update(editTarget.id, data);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    await remove(deleteTarget.id);
    setDeletingId(null);
    setDeleteTarget(null);
  };

  const handleSignOff = async (milestoneId: string) => {
    setSigningOffId(milestoneId);
    await signOff(milestoneId);
    setSigningOffId(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...milestones];
    const temp = updated[index - 1]!;
    updated[index - 1] = updated[index]!;
    updated[index] = temp;
    reorder(updated.map((m) => m.id));
  };

  const handleMoveDown = (index: number) => {
    if (index === milestones.length - 1) return;
    const updated = [...milestones];
    const temp = updated[index + 1]!;
    updated[index + 1] = updated[index]!;
    updated[index] = temp;
    reorder(updated.map((m) => m.id));
  };

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link href={`/projects/${projectId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Project
          </Link>
        </Button>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Milestone className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold">Milestones</h1>
          </div>
          {canManage && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Milestone
            </Button>
          )}
        </div>

        <p className="text-muted-foreground text-sm mt-1">
          Track project milestones and get sign-off on completed work.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-6 text-primary" />
        </div>
      ) : milestones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Milestone className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-base font-medium">No milestones yet</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {canManage
              ? "Add the first milestone to start tracking progress."
              : "No milestones have been added to this project yet."}
          </p>
          {canManage && (
            <Button
              className="mt-4"
              size="sm"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Milestone
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.map((m, i) => (
            <MilestoneCard
              key={m.id}
              milestone={m}
              isFirst={i === 0}
              isLast={i === milestones.length - 1}
              canManage={canManage}
              onEdit={() => setEditTarget(m)}
              onDelete={() => setDeleteTarget(m)}
              onSignOff={() => handleSignOff(m.id)}
              onMoveUp={() => handleMoveUp(i)}
              onMoveDown={() => handleMoveDown(i)}
              signingOff={signingOffId === m.id}
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
