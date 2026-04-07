"use client";

import type {
  BillingRecordItem,
  ProjectItem,
  TicketItem,
  UpcomingMilestoneItem,
} from "@site-haus/contracts";
import { getApi } from "@site-haus/stores/api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { Alert, AlertDescription } from "@site-haus/ui/components/base/alert";
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
import { formatDate, label } from "@site-haus/utils/core/format";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CreditCard,
  FolderKanban,
  Milestone,
  Plus,
  Ticket,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useClientContext } from "@/hooks/use-client-context";
import { statusVariant, ticketStatusVariant } from "@/lib/variants";
import { ProjectHeroCard } from "./project-hero-card";

export function ClientHomeView() {
  const user = useAuthStore((s) => s.user);
  const managedClientId = useAuthStore((s) => s.managedClientId);
  const clientContext = useClientContext();

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [milestones, setMilestones] = useState<UpcomingMilestoneItem[]>([]);
  const [billingRecords, setBillingRecords] = useState<BillingRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetupCard, setShowSetupCard] = useState(false);

  const dismissKey = managedClientId ? `profile_setup_dismissed_${managedClientId}` : null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [projectsRes, ticketsRes, milestonesRes, billingRes, profileRes] =
        await Promise.allSettled([
          getApi().projects.list({ query: {} }),
          getApi().tickets.list({ query: { limit: 5 } }),
          getApi().milestones.listUpcoming({ query: { limit: 10 } }),
          getApi().billing.list({ query: {} }),
          getApi().businessProfiles.getMe(),
        ]);

      if (projectsRes.status === "fulfilled" && projectsRes.value.status === 200)
        setProjects(projectsRes.value.body.projects);
      if (ticketsRes.status === "fulfilled" && ticketsRes.value.status === 200)
        setTickets(ticketsRes.value.body.tickets);
      if (milestonesRes.status === "fulfilled" && milestonesRes.value.status === 200)
        setMilestones(milestonesRes.value.body.milestones);
      if (billingRes.status === "fulfilled" && billingRes.value.status === 200)
        setBillingRecords(billingRes.value.body.records);
      if (
        profileRes.status === "fulfilled" &&
        profileRes.value.status === 404 &&
        clientContext &&
        !(dismissKey && localStorage.getItem(dismissKey) === "true")
      ) {
        setShowSetupCard(true);
      }
    } finally {
      setLoading(false);
    }
  }, [clientContext, dismissKey]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDismiss = () => {
    if (dismissKey) localStorage.setItem(dismissKey, "true");
    setShowSetupCard(false);
  };

  const projectMap = new Map(projects.map((p) => [p.id, p.name]));
  const activeProjects = projects.filter(
    (p) => p.status !== "cancelled" && p.status !== "completed",
  );
  const isSingleProject = activeProjects.length === 1;
  const overdueRecords = billingRecords.filter(
    (r) => r.status === "past_due" || (r.type === "one_time" && r.status === "active"),
  );

  return (
    <div className="space-y-8 pt-6">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ""}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s going on with your projects.
        </p>
      </div>

      {showSetupCard && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Complete your business profile</CardTitle>
                  <CardDescription className="mt-1">
                    Tell us about your brand and goals so we can hit the ground running.
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button asChild size="sm">
                  <Link href="/profile">Set up now</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleDismiss}
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {!loading && overdueRecords.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {overdueRecords.length} outstanding{" "}
            {overdueRecords.length === 1 ? "payment" : "payments"}.{" "}
            <Link href="/billing" className="underline font-medium">
              View billing
            </Link>{" "}
            to take action.
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-6 text-primary" />
        </div>
      ) : (
        <>
          {isSingleProject ? (
            /* ── Single-project hero layout ── */
            <>
              <ProjectHeroCard project={activeProjects[0]!} milestones={milestones} />

              {/* Recent Tickets */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold">Recent Tickets</h2>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/tickets">View all</Link>
                  </Button>
                </div>
                {tickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl border">
                    <Ticket className="mb-2 h-6 w-6 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No tickets yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tickets.map((ticket) => (
                      <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
                        <div className="flex items-start justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{ticket.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {projectMap.get(ticket.projectId) ?? "Unknown project"}
                              {ticket.createdAt && ` · ${formatDate(ticket.createdAt)}`}
                            </p>
                          </div>
                          <Badge
                            variant={ticketStatusVariant(ticket.status)}
                            className="shrink-0 text-xs"
                          >
                            {label(ticket.status)}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div>
                <Separator className="mb-6" />
                <div className="flex flex-wrap gap-3">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/tickets">
                      <Plus className="mr-2 h-3.5 w-3.5" />
                      Submit a Ticket
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/projects">
                      <FolderKanban className="mr-2 h-3.5 w-3.5" />
                      Upload Files
                    </Link>
                  </Button>
                  {clientContext && (
                    <Button asChild variant="outline" size="sm">
                      <Link href="/billing">
                        <CreditCard className="mr-2 h-3.5 w-3.5" />
                        View Billing
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* ── Multi-project grid layout ── */
            <>
              {/* Projects */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold">Your Projects</h2>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/projects">View all</Link>
                  </Button>
                </div>
                {activeProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border">
                    <FolderKanban className="mb-3 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm font-medium">No active projects yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your project will appear here once SiteHaus sets it up.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {activeProjects.map((project) => (
                      <Link key={project.id} href={`/projects/${project.id}`}>
                        <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-sm font-medium leading-snug">
                                {project.name}
                              </CardTitle>
                              <Badge
                                variant={statusVariant(project.status)}
                                className="shrink-0 text-xs"
                              >
                                {label(project.status)}
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

              <div className="grid gap-6 sm:grid-cols-2">
                {/* Recent Tickets */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold">Recent Tickets</h2>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/tickets">View all</Link>
                    </Button>
                  </div>
                  {tickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl border">
                      <Ticket className="mb-2 h-6 w-6 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">No tickets yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tickets.map((ticket) => (
                        <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
                          <div className="flex items-start justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{ticket.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {projectMap.get(ticket.projectId) ?? "Unknown project"}
                                {ticket.createdAt && ` · ${formatDate(ticket.createdAt)}`}
                              </p>
                            </div>
                            <Badge
                              variant={ticketStatusVariant(ticket.status)}
                              className="shrink-0 text-xs"
                            >
                              {label(ticket.status)}
                            </Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Upcoming Milestones */}
                <div>
                  <div className="flex items-center mb-3">
                    <h2 className="text-base font-semibold">Upcoming Milestones</h2>
                  </div>
                  {milestones.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl border">
                      <Milestone className="mb-2 h-6 w-6 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">No upcoming milestones</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {milestones.map((milestone) => (
                        <Link
                          key={milestone.id}
                          href={`/projects/${milestone.projectId}/milestones`}
                        >
                          <div className="flex items-start justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer">
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
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <Separator className="mb-6" />
                <div className="flex flex-wrap gap-3">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/tickets">
                      <Plus className="mr-2 h-3.5 w-3.5" />
                      Submit a Ticket
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/projects">
                      <FolderKanban className="mr-2 h-3.5 w-3.5" />
                      Upload Files
                    </Link>
                  </Button>
                  {clientContext && (
                    <Button asChild variant="outline" size="sm">
                      <Link href="/billing">
                        <CreditCard className="mr-2 h-3.5 w-3.5" />
                        View Billing
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
