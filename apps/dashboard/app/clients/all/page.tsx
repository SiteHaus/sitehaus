"use client";
import { DataTable } from "@site-haus/ui/components/shared/data-table/data-table";
import { usersTable } from "@site-haus/db/core/schema";

type UserRow = typeof usersTable.$inferSelect;
const clients: UserRow[] = [
  {
    id: "1a2b3c4d-1111-2222-3333-444455556666",
    email: "alice@example.com",
    name: "Alice Johnson",
    role: "admin",
    isVerified: true,
    lastLogin: new Date("2025-08-10T14:32:00Z"),
    createdAt: new Date("2024-12-01T09:00:00Z"),
  },
  {
    id: "2b3c4d5e-7777-8888-9999-aaaabbbbcccc",
    email: "bob@example.com",
    name: "Bob Martinez",
    role: "client",
    isVerified: false,
    lastLogin: null,
    createdAt: new Date("2025-01-15T12:45:00Z"),
  },
  {
    id: "3c4d5e6f-dddd-eeee-ffff-111122223333",
    email: "carol@example.com",
    name: "Carol Nguyen",
    role: "admin",
    isVerified: true,
    lastLogin: new Date("2025-08-18T19:10:00Z"),
    createdAt: new Date("2025-03-22T08:30:00Z"),
  },
  {
    id: "4d5e6f70-aaaa-bbbb-cccc-ddddeeeeffff",
    email: "dave@example.com",
    name: "Dave Patel",
    role: "client",
    isVerified: true,
    lastLogin: new Date("2025-08-20T21:55:00Z"),
    createdAt: new Date("2025-05-01T15:20:00Z"),
  },
];

export default function AllProjectsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Clients Directory</h1>
      <DataTable data={clients} defaultColumns={["name", "email", "role"]} />
    </div>
  );
}
