"use client";
import DataTable from "@site-haus/ui/components/shared/data-table";

const serviceTickets = [
  {
    ticketId: "ST-1001",
    title: "Fix login issue",
    customerName: "Acme Corp",
    priority: "High",
    status: "Open",
    createdAt: new Date("2025-07-01"),
    resolvedAt: null,
  },
  {
    ticketId: "ST-1002",
    title: "Update billing info",
    customerName: "Globex",
    priority: "Medium",
    status: "Resolved",
    createdAt: new Date("2025-06-25"),
    resolvedAt: new Date("2025-07-03"),
  },
];

export default function AllTicketsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">All Tickets</h1>
      <DataTable table={serviceTickets} />
    </div>
  );
}
