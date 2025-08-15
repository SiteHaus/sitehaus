"use client";
import DataTable from "@site-haus/ui/components/shared/data-table";

const clients = [
  {
    id: "client_123",
    name: "Acme Inc.",
    contactName: "Jane Doe",
    email: "jane@acme.com",
    phone: "+1 (555) 123-4567",
    status: "active",
    joinedAt: new Date("2024-01-15"),
  },
  {
    id: "client_456",
    name: "Globex Corp",
    contactName: "John Smith",
    email: "john@globex.com",
    phone: "+1 (555) 987-6543",
    status: "inactive",
    joinedAt: new Date("2023-10-22"),
  },
];

export default function AllProjectsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Clients Directory</h1>
      <DataTable table={clients} />
    </div>
  );
}
