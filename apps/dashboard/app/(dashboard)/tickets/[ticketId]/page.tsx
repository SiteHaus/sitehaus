"use client";
import { getApi } from "@site-haus/stores/api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@site-haus/ui/components/base/card";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { formatDate } from "@site-haus/utils/core/format";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Pencil,
  Tag,
  MessageCircle,
  User,
  AlertCircle,
  CheckCircle2,
  CircleDot,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { TicketTypeBadge } from "../_components/TicketTypeBadge";
import { TicketStatusBadge } from "../_components/TicketStatusBadge";
import { PriorityIndicator } from "../_components/PriorityIndicator";
import { TicketDetail } from "@site-haus/contracts";
import { CommentList } from "@/components/comments/comment-list";
import { Separator } from "@site-haus/ui/components/base/separator";
import { CommentForm } from "@/components/comments/comment-form";
import { useComments } from "@/hooks/use-comments";
import { TicketAudienceBadge } from "../_components/TicketAudienceBadge";
import { useIsEmployee } from "@/hooks/use-is-employee";
import { AuditLogItem } from "@site-haus/contracts";
import { label } from "@site-haus/utils/core/format";

function formatAuditAction(
  action: string,
  meta: unknown,
  staffMap: Record<string, string>,
): string {
  const m = (meta && typeof meta === "object" ? meta : {}) as Record<string, string>;
  switch (action) {
    case "ticket.created":
      return "Ticket created";
    case "ticket.status_changed":
      return `Status changed from ${m.from ? label(m.from) : "unknown"} to ${m.to ? label(m.to) : "unknown"}`;
    case "ticket.updated":
      return `Update ticket`;
    case "ticket.assigned":
      return `Assigned to ${m.assigneeId ? (staffMap[m.assigneeId] ?? m.assigneeId) : "unknown"}`;
    case "ticket.unassigned":
      return "Unassigned";
    default:
      return label(action);
  }
}

export default function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const canManage = useAuthStore((s) => s.hasPerm("tickets:manage"));
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [activityCursor, setActivityCursor] = useState<string | undefined>();
  const [hasMoreActivity, setHasMoreActivity] = useState(false);
  const [activity, setActivity] = useState<AuditLogItem[]>([]);
  const [staffMap, setStaffMap] = useState<Record<string, string>>({});

  const {
    threads,
    loading: commentsLoading,
    addComment,
    updateComment,
    removeComment,
  } = useComments("ticket", ticket?.id ?? "");

  const isEmployee = useIsEmployee();

  const fetchTicket = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getApi().tickets.get({ params: { ticketId } });
      if (res.status === 200) {
        setTicket(res.body.ticket);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  const fetchStaff = useCallback(async () => {
    const res = await getApi().clients.firstParty();
    if (res.status === 200) {
      setStaffMap(
        Object.fromEntries(res.body.staff.map((m) => [m.id, `${m.firstName} ${m.lastName}`])),
      );
    }
  }, []);

  const fetchActivity = useCallback(
    async (cursor?: string) => {
      const res = await getApi().audit.list({
        query: { targetType: "ticket", targetId: ticketId, limit: 5, cursor },
      });
      if (res.status === 200) {
        setActivity((prev) => (cursor ? [...prev, ...res.body.logs] : res.body.logs));
        setActivityCursor(res.body.nextCursor);
        setHasMoreActivity(!!res.body.nextCursor);
      }
    },
    [ticketId],
  );

  useEffect(() => {
    fetchTicket();
    fetchActivity();
    fetchStaff();
  }, [fetchTicket, fetchActivity, fetchStaff]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (notFound || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h3 className="text-lg font-medium">Ticket not found</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          This ticket may have been deleted or you don&apos;t have access.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/tickets">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tickets
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link href="/tickets">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tickets
          </Link>
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{ticket.title}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <TicketAudienceBadge audience={isEmployee} />

            <TicketStatusBadge status={ticket.status} />

            <TicketTypeBadge type={ticket.type} />
            {canManage && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/tickets/${ticketId}/edit`}>
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Edit
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <AlertCircle className="h-4 w-4" />
            </div>
            <CardTitle className="text-lg mt-2 flex items-center gap-2">
              <PriorityIndicator priority={ticket.priority} />
            </CardTitle>
            <CardDescription>Priority</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <CircleDot className="h-4 w-4" />
            </div>
            <CardTitle className="text-lg mt-2">
              <TicketStatusBadge status={ticket.status} />
            </CardTitle>
            <CardDescription>Status</CardDescription>
          </CardHeader>
          <CardContent>
            {ticket.closedAt && (
              <p className="text-xs text-muted-foreground">Closed {formatDate(ticket.closedAt)}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-500">
              <User className="h-4 w-4" />
            </div>
            <CardTitle className="text-lg mt-2">
              {ticket.assignee
                ? `${ticket.assignee?.firstName} ${ticket.assignee?.lastName}`
                : "Unknown"}
            </CardTitle>
            <CardDescription>Assignee</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Reported by{" "}
              {ticket.author ? `${ticket.author.firstName} ${ticket.author.lastName}` : "Unknown"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-500">
              <MessageCircle className="h-4 w-4" />
            </div>
            <CardTitle className="text-lg mt-2">{ticket.commentCount}</CardTitle>
            <CardDescription>Comments</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {ticket.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{ticket.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Details card */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Classification
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Type:</span>
                <TicketTypeBadge type={ticket.type} />
              </div>

              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Priority:</span>
                <span className="flex items-center gap-1.5">
                  <PriorityIndicator priority={ticket.priority} />
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Timeline
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {ticket.createdAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Created:</span>
                  <span>{formatDate(ticket.createdAt)}</span>
                </div>
              )}
              {ticket.updatedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Updated:</span>
                  <span>{formatDate(ticket.updatedAt)}</span>
                </div>
              )}
              {ticket.closedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Closed:</span>
                  <span>{formatDate(ticket.closedAt)}</span>
                </div>
              )}
            </div>

            {/* Activity log */}
            <div className="mt-4 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Activity
              </p>
              {activity.map((entry) => (
                <div key={entry.id} className="flex gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                  <div>
                    <p className="text-foreground">
                      {formatAuditAction(entry.action, entry.meta, staffMap)}
                      {entry.user && (
                        <span className="text-muted-foreground ml-1">
                          by {entry.user.firstName} {entry.user.lastName}
                        </span>
                      )}
                    </p>{" "}
                    <p className="text-muted-foreground">{formatDate(entry.createdAt)}</p>
                  </div>
                </div>
              ))}
              {activity.length === 0 && (
                <p className="text-xs text-muted-foreground">No activity yet.</p>
              )}
              {hasMoreActivity && (
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={() => fetchActivity(activityCursor)}
                >
                  Load more
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CommentList
            threads={threads}
            loading={commentsLoading}
            onReply={(parentId) => setReplyTo(parentId)}
            onEdit={updateComment}
            onDelete={removeComment}
          />

          {replyTo && (
            <div className="ml-10">
              <p className="mb-1 text-xs text-muted-foreground">Replying...</p>
              <CommentForm
                parentId={replyTo}
                onSubmit={addComment}
                onCancel={() => setReplyTo(null)}
                placeholder="Write a reply..."
              />
            </div>
          )}

          <Separator />

          <CommentForm onSubmit={addComment} placeholder="Write a comment..." />
        </CardContent>
      </Card>
    </div>
  );
}
