"use client";

import { type ProjectDetail } from "@site-haus/contracts";
import { getApi } from "@site-haus/stores/api";
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
import { Spinner } from "@site-haus/ui/components/base/spinner";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  ExternalLink,
  FileText,
  Globe,
  Milestone,
  Pencil,
  Ticket,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const statusVariant = (s: string) => {
  switch (s) {
    case "launched":
    case "completed":
      return "success" as const;
    case "in_progress":
      return "warning" as const;
    case "cancelled":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
};

const billingVariant = (s: string | null) => {
  switch (s) {
    case "paid":
      return "success" as const;
    case "late":
      return "destructive" as const;
    case "outstanding":
      return "warning" as const;
    default:
      return "secondary" as const;
  }
};

const label = (s: string) =>
  s.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase());

const formatDate = (d: string | null) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatCents = (cents: number | null) => {
  if (cents == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
};

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
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
            <Button asChild size="sm" variant="outline">
              <Link href={`/projects/${projectId}/edit`}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edit
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Ticket className="h-3.5 w-3.5" />
              Tickets
            </CardDescription>
            <CardTitle className="text-2xl">{project.ticketCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {project.openTicketCount} open
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Milestone className="h-3.5 w-3.5" />
              Milestones
            </CardDescription>
            <CardTitle className="text-2xl">
              {project.milestoneCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Total milestones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              Billing
            </CardDescription>
            <CardTitle className="text-2xl">
              {project.billingStatus ? (
                <Badge variant={billingVariant(project.billingStatus)}>
                  {label(project.billingStatus)}
                </Badge>
              ) : (
                <span className="text-muted-foreground text-sm">N/A</span>
              )}
            </CardTitle>
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
            <CardDescription className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              Client
            </CardDescription>
            <CardTitle className="text-lg">
              {project.client?.name ?? "Unknown"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.creator && (
              <p className="text-xs text-muted-foreground">
                Created by {project.creator.firstName} {project.creator.lastName}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-2">
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

            {project.depositAmountCents != null && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Deposit:</span>
                <span>{formatCents(project.depositAmountCents)}</span>
              </div>
            )}
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-3">
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
        </CardContent>
      </Card>
    </div>
  );
}
