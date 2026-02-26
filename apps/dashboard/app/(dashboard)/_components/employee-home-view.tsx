"use client";

import type {
  AdminBillingOverview,
  ProjectItem,
  TicketItem,
  UpcomingMilestoneItem,
} from "@site-haus/contracts";
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
  AlertTriangle,
  Calendar,
  FolderKanban,
  Milestone,
  Ticket,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { priorityVariant } from "@/lib/variants";

export function EmployeeHomeView() {
  const user = useAuthStore((s) => s.user);

  const [billing, setBilling] = useState<AdminBillingOverview | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [milestones, setMilestones] = useState<UpcomingMilestoneItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [billingRes, projectsRes, ticketsRes, milestonesRes] =
        await Promise.allSettled([
          getApi().billing.getAdminOverview(),
          getApi().projects.list({ query: { status: "in_progress", limit: 100 } }),
          getApi().tickets.list({ query: { status: "open", limit: 6 } }),
          getApi().milestones.listUpcoming({ query: { limit: 5 } }),
        ]);

      if (billingRes.status === "fulfilled" && billingRes.value.status === 200)
        setBilling(billingRes.value.body);
      if (projectsRes.status === "fulfilled" && projectsRes.value.status === 200)
        setProjects(projectsRes.value.body.projects);
      if (ticketsRes.status === "fulfilled" && ticketsRes.value.status === 200)
        setTickets(ticketsRes.value.body.tickets);
      if (milestonesRes.status === "fulfilled" && milestonesRes.value.status === 200)
        setMilestones(milestonesRes.value.body.milestones);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          Hey{user?.firstName ? `, ${user.firstName}` : ""}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s where things stand today.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-6 text-primary" />
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <FolderKanban className="h-3.5 w-3.5" />
                  Active Projects
                </CardDescription>
                <CardTitle className="text-2xl">{projects.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">in progress</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Ticket className="h-3.5 w-3.5" />
                  Open Tickets
                </CardDescription>
                <CardTitle className="text-2xl">{tickets.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">need attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  MRR
                </CardDescription>
                <CardTitle className="text-2xl">
                  {billing ? formatCents(billing.mrrCents) : "—"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">per month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Overdue
                </CardDescription>
                <CardTitle className="text-2xl">
                  {billing && billing.overdueCount > 0 ? (
                    <span className="text-destructive">
                      {formatCents(billing.overdueAmountCents)}
                    </span>
                  ) : (
                    <span>{formatCents(0)}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {billing?.overdueCount ?? 0} overdue{" "}
                  {(billing?.overdueCount ?? 0) === 1 ? "record" : "records"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tickets + Milestones */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold">Open Tickets</h2>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/tickets">View all</Link>
                </Button>
              </div>
              {tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl border">
                  <Ticket className="mb-2 h-6 w-6 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No open tickets</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tickets.map((ticket) => (
                    <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
                      <div className="flex items-start justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{ticket.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {label(ticket.type)}
                            {ticket.createdAt && ` · ${formatDate(ticket.createdAt)}`}
                          </p>
                        </div>
                        {ticket.priority !== "normal" && (
                          <Badge
                            variant={priorityVariant(ticket.priority)}
                            className="shrink-0 text-xs"
                          >
                            {label(ticket.priority)}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center mb-3">
                <h2 className="text-base font-semibold">Upcoming Milestones</h2>
              </div>
              {milestones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl border">
                  <Milestone className="mb-2 h-6 w-6 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    No upcoming milestones
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {milestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className="flex items-start justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{milestone.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {milestone.projectName}
                        </p>
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
          </div>

          {/* Active Projects */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Active Projects</h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/projects">View all</Link>
              </Button>
            </div>
            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl border">
                <FolderKanban className="mb-2 h-6 w-6 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No projects in progress</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {projects.slice(0, 6).map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-sm font-medium leading-snug">
                            {project.name}
                          </CardTitle>
                          <Badge variant="warning" className="shrink-0 text-xs">
                            In Progress
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">
                          {label(project.type)}
                          {project.dueDate && ` · Due ${formatDate(project.dueDate)}`}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
