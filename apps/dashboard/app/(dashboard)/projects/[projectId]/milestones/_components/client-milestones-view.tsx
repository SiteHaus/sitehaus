"use client";

import { useMilestones } from "@/hooks/use-milestones";
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
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { Milestone } from "lucide-react";
import { useState } from "react";
import { MilestoneCard } from "./milestone-card";

interface ClientMilestonesViewProps {
  projectId: string;
}

export function ClientMilestonesView({ projectId }: ClientMilestonesViewProps) {
  const { milestones, loading, signOff } = useMilestones(projectId);
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
  const [signingOffId, setSigningOffId] = useState<string | null>(null);

  const handleConfirmSignOff = async () => {
    if (!confirmTarget) return;
    setSigningOffId(confirmTarget);
    setConfirmTarget(null);
    await signOff(confirmTarget);
    setSigningOffId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (milestones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Milestone className="mb-4 h-12 w-12 text-muted-foreground/40" />
        <h3 className="text-base font-medium">No milestones yet</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Your project milestones will appear here once your SiteHaus team sets
          them up.
        </p>
      </div>
    );
  }

  const completedCount = milestones.filter(
    (m) => m.status === "completed",
  ).length;
  const total = milestones.length;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {completedCount} of {total}{" "}
            {total === 1 ? "step" : "steps"} complete
          </span>
          <span className="font-medium">{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Milestone list */}
      <div className="space-y-3">
        {milestones.map((m) => (
          <MilestoneCard
            key={m.id}
            milestone={m}
            canManage={false}
            onSignOff={() => setConfirmTarget(m.id)}
            signingOff={signingOffId === m.id}
          />
        ))}
      </div>

      <AlertDialog
        open={!!confirmTarget}
        onOpenChange={(o) => {
          if (!o) setConfirmTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign off on this milestone?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm that you&apos;ve reviewed and approved this milestone.
              This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSignOff}>
              Yes, sign off
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
