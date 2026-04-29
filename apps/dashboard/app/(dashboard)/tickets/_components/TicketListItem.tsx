import { TicketStatusBadge } from "./TicketStatusBadge";
import { TicketTypeBadge } from "./TicketTypeBadge";
import { PriorityIndicator } from "./PriorityIndicator";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@site-haus/ui/components/base/dropdown-menu";
import { ticketStatusValues } from "@site-haus/validation/core/enums";
import { label } from "@site-haus/utils/core/format";
import { MeClient, ProjectItem, TicketDetail } from "@site-haus/contracts";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

type TicketStatus = (typeof ticketStatusValues)[number];

type Options = {
  canManage: boolean;
  projects: ProjectItem[];
  members: MeClient[];
  onAssign: (ticketId: string, assigneeId: string) => void;
  onStatusChange: (ticketId: string, status: TicketStatus) => void;
};

export function buildTicketListColumns({
  canManage,
  onStatusChange,
  projects,
  onAssign,
  members,
}: Options) {
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));
  const memberMap: Record<string, string> = Object.fromEntries(
    members.map((m) => [m.id, `${m.firstName} ${m.lastName}`]),
  );
  return {
    excludeColumns: ["description", "id", "authorId", "closedAt", "updatedAt"] as string[],

    defaultColumns: [
      "number",
      "title",
      "projectId",
      "clientId",
      "type",
      "priority",
      "status",
      "assigneeId",
      "createdAt",
    ],

    columnLabels: {
      number: "#",
      projectId: "Project",
      clientId: "Client",
      assigneeId: "Assignee",
      createdAt: "Created",
      priority: "Priority",
      status: "Status",
      type: "Type",
    },

    columnRenderers: {
      number: (v: unknown) => (
        <span className="font-mono text-muted-foreground text-xs">#{v as number}</span>
      ),
      type: (v: unknown) => <TicketTypeBadge type={v as string} />,
      priority: (v: unknown) => (
        <div className="flex items-center gap-2">
          <PriorityIndicator priority={v as string} />
        </div>
      ),
      projectId: (v: unknown) => {
        // row param not needed anymore
        const id = v as string;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Link href={`/projects/${id}`} className="underline decoration-dotted">
              {projectMap[id]}
            </Link>
          </div>
        );
      },
      status: (v: unknown, row: Record<string, unknown>) => {
        const ticket = row as TicketDetail;
        return canManage ? (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span className="inline-block cursor-pointer">
                  <TicketStatusBadge status={v as string} />
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {ticketStatusValues.map((s) => (
                  <DropdownMenuItem key={s} onSelect={() => onStatusChange(ticket.id, s)}>
                    {label(s)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <TicketStatusBadge status={v as string} />
        );
      },
      createdAt: (v: unknown) => {
        return formatDistanceToNow(new Date(v as string), { addSuffix: true });
      },
      assigneeId: (v: unknown, row: Record<string, unknown>) => {
        const ticket = row as TicketDetail;
        const current = memberMap[v as string] ?? "Unassigned";
        return canManage ? (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span className="inline-block cursor-pointer text-sm underline decoration-dotted">
                  {current}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {Object.entries(memberMap).map(([id, name]) => (
                  <DropdownMenuItem key={id} onSelect={() => onAssign(ticket.id, id)}>
                    {name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <span>{current}</span>
        );
      },
    },
  };
}
