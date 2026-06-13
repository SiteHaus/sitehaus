"use client";

import { useIsEmployee } from "@/hooks/use-is-employee";
import { ArrowLeft, Milestone } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ClientMilestonesView } from "./_components/client-milestones-view";
import { EmployeeMilestonesView } from "./_components/employee-milestones-view";
import { PageHero } from "@site-haus/ui/components/shared/page-hero";

export default function MilestonesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const isEmployee = useIsEmployee();

  return (
    <div className="space-y-6">
      <PageHero
        icon={Milestone}
        title="Milestones"
        subtitle="Track progress and sign off on completed work."
        back={
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Project
          </Link>
        }
      />

      {isEmployee ? (
        <EmployeeMilestonesView projectId={projectId} />
      ) : (
        <ClientMilestonesView projectId={projectId} />
      )}
    </div>
  );
}
