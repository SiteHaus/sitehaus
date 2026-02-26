"use client";

import { useIsEmployee } from "@/hooks/use-is-employee";
import { Button } from "@site-haus/ui/components/base/button";
import { ArrowLeft, Milestone } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ClientMilestonesView } from "./_components/client-milestones-view";
import { EmployeeMilestonesView } from "./_components/employee-milestones-view";

export default function MilestonesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const isEmployee = useIsEmployee();

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link href={`/projects/${projectId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Project
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Milestone className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Milestones</h1>
        </div>
      </div>

      {isEmployee ? (
        <EmployeeMilestonesView projectId={projectId} />
      ) : (
        <ClientMilestonesView projectId={projectId} />
      )}
    </div>
  );
}
