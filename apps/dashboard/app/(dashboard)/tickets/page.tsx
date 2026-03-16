"use client";

import { MeClient, ProjectItem, TicketItem } from "@site-haus/contracts"; // ← TicketDetail
import { getApi } from "@site-haus/stores/api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { Button } from "@site-haus/ui/components/base/button";
import { Input } from "@site-haus/ui/components/base/input";
import { useSearchParams } from "next/navigation";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import {
  Ticket,
  Plus,
  Search,
  UserCheck,
  ChevronDown,
  CircleCheck,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuContent,
} from "@site-haus/ui/components/base/dropdown-menu";
import { TicketsDataTable } from "./_components/TicketsDataTable";
import { ticketStatusValues } from "@site-haus/validation/core/enums";

type TicketStatus = (typeof ticketStatusValues)[number];

export default function TicketsPage() {
  const [search, setSearch] = useState("");
  const [tickets, setTickets] = useState<TicketItem[]>([]); // ← TicketDetail
  const [members, setMembers] = useState<MeClient[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTickets, setSelectedTickets] = useState<TicketItem[]>([]); // ← TicketDetail

  const hasPerm = useAuthStore((s) => s.hasPerm);
  const canManage = hasPerm("tickets:manage");

  const searchParams = useSearchParams();
  const assignedToMe = searchParams.get("assignedToMe") === "true";
  const me = useAuthStore((s) => s.user);

  const memberMap: Record<string, string> = Object.fromEntries(
    members.map((m) => [m.id, `${m.firstName} ${m.lastName}`]),
  );

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getApi().tickets.list({ query: { limit: 50 } });
      if (res.status === 200) setTickets(res.body.tickets);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getApi().projects.list({ query: { limit: 50 } });
      if (res.status === 200) setProjects(res.body.projects);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await getApi().clients.firstParty();
      if (res.status === 200) {
        setMembers(res.body.staff);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    fetchStaff();
    fetchProjects();
  }, []);

  const handleAssign = async (ticketId: string, assigneeId: string) => {
    const res = await getApi().tickets.assign({
      params: { ticketId },
      body: { assigneeId },
    });
    if (res.status === 200) {
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, assigneeId } : t)),
      );
    } else {
      toast(
        (res.body as { message?: string }).message ?? "Failed to assign ticket",
      );
    }
  };

  const handleStatusChange = async (ticketId: string, status: TicketStatus) => {
    const res = await getApi().tickets.transitionStatus({
      params: { ticketId },
      body: { status },
    });
    if (res.status === 200) {
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status } : t)),
      );
    } else {
      toast(
        (res.body as { message?: string }).message ?? "Failed to update status",
      );
    }
  };

  const handleBulkClose = async () => {
    try {
      await Promise.all(
        selectedTickets.map((t) => handleStatusChange(t.id, "closed")),
      );
      setSelectedTickets([]);
    } catch (e: any) {
      toast(e.message);
    }
  };

  const handleBulkAssign = async (assigneeId: string) => {
    await Promise.all(
      selectedTickets.map((t) => handleAssign(t.id, assigneeId)),
    );
  };

  const filtered = tickets.filter((t) => {
    if (assignedToMe && t.assigneeId !== me?.id) return false;
    if (!search) return true;
    return (
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.type.toLowerCase().includes(search.toLowerCase()) ||
      t.status.toLowerCase().includes(search.toLowerCase()) ||
      t.priority.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            {assignedToMe ? "Assigned to Me" : "My Tickets"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {assignedToMe
              ? "Tickets currently assigned to you."
              : "View, create, and track all your support tickets."}
          </p>
        </div>
        <div className="flex items-center gap-3 mb-5">
          {canManage && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
          <Button asChild>
            <Link href="/tickets/new">
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-6 text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Ticket className="h-12 w-12 text-muted-foreground/50 mb-4" />
          {search ? (
            <>
              <h3 className="text-lg font-medium">No tickets found</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Try adjusting your search.
              </p>
            </>
          ) : !canManage ? (
            <>
              <h3 className="text-lg font-medium">No tickets yet</h3>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/tickets/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Submit a Ticket
                </Link>
              </Button>
            </>
          ) : (
            <h3 className="text-lg font-medium">No tickets here yet</h3>
          )}
        </div>
      ) : (
        <>
          {selectedTickets.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/50 border rounded-lg mb-5">
              <div className="flex items-center gap-2 pr-3 border-r">
                <div className="bg-primary text-primary-foreground text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                  {selectedTickets.length}
                </div>
                <span className="text-sm text-muted-foreground">selected</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8">
                    <UserCheck className="mr-2 h-3.5 w-3.5" />
                    Assign
                    <ChevronDown className="ml-2 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {Object.entries(memberMap).map(([id, name]) => (
                    <DropdownMenuItem
                      key={id}
                      onSelect={() => handleBulkAssign(id)}
                    >
                      {name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={handleBulkClose}
              >
                <CircleCheck className="mr-2 h-3.5 w-3.5" />
                Close tickets
              </Button>
            </div>
          )}

          <TicketsDataTable
            tickets={filtered}
            projects={projects}
            members={members}
            canManage={canManage}
            onAssign={handleAssign}
            onStatusChange={handleStatusChange}
            onSelectionChange={setSelectedTickets}
          />
        </>
      )}
    </>
  );
}
