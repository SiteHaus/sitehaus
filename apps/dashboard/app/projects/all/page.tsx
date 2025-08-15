"use client";
import DataTable from "@site-haus/ui/components/shared/data-table";

const projects = [
  {
    name: "Website Redesign",
    description: "Full redesign of the client marketing site",
    siteDomain: "example.com",
    stagingDomain: "staging.example.com",
    repoUrl: "https://github.com/org/project",
    isActive: true,
    dueDate: new Date("2025-02-28"),
    monthlyRateCents: 50000,
    depositAmountCents: 20000,
    billingStatus: "pending",
  },
  {
    name: "Mobile App Launch",
    description: "Initial release of the mobile app MVP",
    siteDomain: null,
    stagingDomain: null,
    repoUrl: "https://github.com/org/mobile-app",
    isActive: false,
    dueDate: new Date("2025-03-01"),
    launchedAt: new Date("2025-03-05"),
    monthlyRateCents: 80000,
    depositAmountCents: 40000,
    billingStatus: "paid",
  },
];

export default function AllProjectsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">All Projects</h1>
      <DataTable table={projects} />
    </div>
  );
}
