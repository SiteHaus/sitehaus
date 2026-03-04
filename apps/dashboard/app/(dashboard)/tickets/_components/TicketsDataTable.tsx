"use client";
import { MeClient, TicketItem } from "@site-haus/contracts";
import { ProjectItem } from "@site-haus/contracts";
import { DataTable } from "@site-haus/ui/components/shared/data-table/data-table";
import { ticketStatusValues } from "@site-haus/validation/core/enums";
import { buildTicketListColumns } from "./TicketListItem";
import { useRouter } from "next/navigation";

type TicketStatus = (typeof ticketStatusValues)[number];

type Props = {
  tickets: TicketItem[];
  projects: ProjectItem[];
  members: MeClient[];
  canManage: boolean;
  onAssign: (ticketId: string, assigneeId: string) => void;
  onStatusChange: (ticketId: string, status: TicketStatus) => void;
  onSelectionChange: (rows: TicketItem[]) => void;
};

export function TicketsDataTable({
  tickets,
  projects,
  members,
  canManage,
  onAssign,
  onStatusChange,
  onSelectionChange,
}: Props) {
  const router = useRouter();

  const columnConfig = buildTicketListColumns({
    canManage,
    projects,
    members,
    onAssign,
    onStatusChange,
  });

  return (
    <DataTable
      data={tickets as Record<string, unknown>[]}
      {...columnConfig}
      onSelectionChange={(rows) => onSelectionChange(rows as TicketItem[])}
      onRowClick={(row) => router.push(`/tickets/${(row as TicketItem).id}`)}
    />
  );
}
