"use client";
import { DataTable } from "@site-haus/ui/components/shared/data-table/data-table";

export default function AllClientsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Clients Directory</h1>
      <DataTable data={[]} defaultColumns={["name", "email", "role"]} />
    </div>
  );
}
