"use client";

import { billingVariant, statusVariant } from "@/lib/variants";
import { type ProjectDetail } from "@site-haus/contracts";
import { getApi } from "@site-haus/stores/api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { Badge } from "@site-haus/ui/components/base/badge";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@site-haus/ui/components/base/card";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { formatCents, formatDate, label } from "@site-haus/utils/core/format";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  DollarSign,
  ExternalLink,
  FileText,
  FolderOpen,
  Globe,
  Milestone,
  Pencil,
  ScrollText,
  Ticket,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ProjectBillingSection } from "./_components/project-billing-section";

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const canManage = useAuthStore((s) => s.hasPerm("projects:manage"));
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchProject = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getApi().projects.get({
        params: { projectId },
      });
      if (res.status === 200) {
        setProject(res.body.project);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h3 className="text-lg font-medium">Project not found</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          This project may have been deleted or you don&apos;t have access.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link href="/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Projects
          </Link>
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground mt-1">
                {project.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={statusVariant(project.status)}>
              {label(project.status)}
            </Badge>
            <Badge variant="outline">{label(project.type)}</Badge>
            {canManage && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/projects/${projectId}/edit`}>
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Edit
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Ticket className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl mt-2">
              {project.ticketCount}
            </CardTitle>
            <CardDescription>Tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {project.openTicketCount} open
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Milestone className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl mt-2">
              {project.milestoneCount}
            </CardTitle>
            <CardDescription>Milestones</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Total milestones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-500">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl mt-2">
              {project.billingStatus ? (
                <Badge variant={billingVariant(project.billingStatus)}>
                  {label(project.billingStatus)}
                </Badge>
              ) : (
                <span className="text-muted-foreground text-sm">N/A</span>
              )}
            </CardTitle>
            <CardDescription>Billing</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {formatCents(project.monthlyRateCents)
                ? `${formatCents(project.monthlyRateCents)}/mo`
                : "No rate set"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <User className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-lg mt-2">
              {project.client?.name ?? "Unknown"}
            </CardTitle>
            <CardDescription>Client</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {project.creator && (
              <p className="text-xs text-muted-foreground">
                Created by {project.creator.firstName}{" "}
                {project.creator.lastName}
              </p>
            )}
            {canManage && project.client && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-7 text-xs"
              >
                <Link href={`/clients/${project.client.id}/business-profile`}>
                  View Business Profile
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="cursor-pointer transition-colors hover:bg-muted/50 group">
          <Link href={`/projects/${projectId}/design-document`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ScrollText className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <CardTitle className="mt-3">View Design Document</CardTitle>
              <CardDescription>
                Review and manage the project design document
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50 group">
          <Link href={`/projects/${projectId}/milestones`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Milestone className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <CardTitle className="mt-3">Project Milestones</CardTitle>
              <CardDescription>
                Track progress and sign off on completed milestones
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50 group">
          <Link href={`/projects/${projectId}/assets`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <CardTitle className="mt-3">Project Assets</CardTitle>
              <CardDescription>
                Logos, images, fonts, and other project files
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>

      {project.client && (
        <ProjectBillingSection
          projectId={project.id}
          clientId={project.client.id}
          monthlyRateCents={project.monthlyRateCents}
          depositAmountCents={project.depositAmountCents}
          canManage={canManage}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Links
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {project.siteDomain && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Domain:</span>
                  <a
                    href={`https://${project.siteDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {project.siteDomain}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {project.stagingDomain && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Staging:</span>
                  <a
                    href={`https://${project.stagingDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {project.stagingDomain}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {project.repoUrl && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Repo:</span>
                  <a
                    href={project.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline truncate"
                  >
                    {project.repoUrl.replace("https://github.com/", "")}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Timeline
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {project.depositAmountCents != null && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Deposit:</span>
                  <span>{formatCents(project.depositAmountCents)}</span>
                </div>
              )}

              {project.startDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Started:</span>
                  <span>{formatDate(project.startDate)}</span>
                </div>
              )}

              {project.dueDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Due:</span>
                  <span>{formatDate(project.dueDate)}</span>
                </div>
              )}

              {project.launchedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Launched:</span>
                  <span>{formatDate(project.launchedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
