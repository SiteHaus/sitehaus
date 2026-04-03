"use client";

import type { ProjectItem, UpcomingMilestoneItem } from "@site-haus/contracts";
import { Badge } from "@site-haus/ui/components/base/badge";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@site-haus/ui/components/base/card";
import { Separator } from "@site-haus/ui/components/base/separator";
import { formatDate, label } from "@site-haus/utils/core/format";
import { Calendar, CheckCircle2, FolderKanban } from "lucide-react";
import Link from "next/link";
import { statusVariant } from "@/lib/variants";
import { MilestoneStatusIcon } from "./milestone-status-icon";

interface ProjectHeroCardProps {
  project: ProjectItem;
  milestones: UpcomingMilestoneItem[];
}

export function ProjectHeroCard({ project, milestones }: ProjectHeroCardProps) {
  const projectMilestones = milestones.filter((m) => m.projectId === project.id);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FolderKanban className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-xl leading-snug">{project.name}</CardTitle>
              <Badge variant={statusVariant(project.status)} className="shrink-0">
                {label(project.status)}
              </Badge>
            </div>
            <CardDescription className="mt-1">
              {label(project.type)}
              {project.dueDate && ` · Due ${formatDate(project.dueDate)}`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Separator />
        <div>
          <p className="text-sm font-semibold mb-3">Upcoming Milestones</p>
          {projectMilestones.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              All caught up — no upcoming milestones.
            </div>
          ) : (
            <div className="space-y-2.5">
              {projectMilestones.map((milestone) => (
                <div key={milestone.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <MilestoneStatusIcon status={milestone.status} />
                    <span className="text-sm truncate">{milestone.name}</span>
                  </div>
                  {milestone.dueDate && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Calendar className="h-3 w-3" />
                      {formatDate(milestone.dueDate)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end pt-1">
          <Button asChild size="sm" variant="outline">
            <Link href={`/projects/${project.id}`}>View Project →</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
