"use client";

import { Project } from "@site-haus/db/types";
import { Sidebar, useSidebar } from "@site-haus/ui/components/base/sidebar";
import { AppSideBarContent } from "./app-sidebar-content";
import { AppSideBarFooter } from "./app-sidebar-footer";
import { AppSideBarHeader } from "./app-sidebar-header";

export const fakeProjects: Project[] = [
  {
    id: "f5a1c0e1-5db2-4b4a-ae1e-1f6f11a28f01",
    userId: "user-1234",
    name: "BearFoot Coffee",
    description: "Ecommerce site for a boutique coffee roaster.",
    status: "active",
    type: "ecommerce",
    siteDomain: "bearfootcoffee.com",
    stagingDomain: "staging.bearfootcoffee.com",
    repoUrl: "https://github.com/sitehaus/bearfoot-coffee",
    isActive: true,
    startDate: new Date("2024-04-15"),
    dueDate: new Date("2024-09-01"),
    launchedAt: new Date("2024-08-20"),
    monthlyRateCents: 15000, // $150/mo
    depositAmountCents: 50000, // $500 deposit
    billingStatus: "paid",
    createdAt: new Date("2024-04-10"),
    updatedAt: new Date(),
  },
  {
    id: "e8b90e3f-2cbb-4b1d-8b97-8d91c489f202",
    userId: "user-5678",
    name: "SkyFlow SaaS Dashboard",
    description: "Admin dashboard UI for SkyFlow's SaaS platform.",
    status: "reviewing",
    type: "saas",
    siteDomain: "dashboard.skyflow.io",
    stagingDomain: "staging.skyflow.io",
    repoUrl: "https://github.com/sitehaus/skyflow-dashboard",
    isActive: true,
    startDate: new Date("2024-06-01"),
    dueDate: new Date("2024-11-15"),
    launchedAt: null,
    monthlyRateCents: 20000, // $200/mo
    depositAmountCents: 75000, // $750 deposit
    billingStatus: "pending",
    createdAt: new Date("2024-05-25"),
    updatedAt: new Date(),
  },
  {
    id: "c2f1e9d6-1d3e-4b70-84d3-95f493db4b91",
    userId: "user-1234",
    name: "Luna's Personal Portfolio",
    description: "Modern web portfolio for a UX designer.",
    status: "paused",
    type: "portfolio",
    siteDomain: "luna.design",
    stagingDomain: "staging.luna.design",
    repoUrl: "https://github.com/sitehaus/luna-portfolio",
    isActive: false,
    startDate: new Date("2024-02-10"),
    dueDate: new Date("2024-04-20"),
    launchedAt: null,
    monthlyRateCents: 5000, // $50/mo
    depositAmountCents: 25000, // $250 deposit
    billingStatus: "outstanding",
    createdAt: new Date("2024-02-05"),
    updatedAt: new Date(),
  },
];

export const AppSideBar = () => {
  const { isMobile } = useSidebar();

  return (
    <Sidebar variant="inset" collapsible="icon">
      <AppSideBarHeader
        userRole="admin"
        projects={fakeProjects}
        isMobile={isMobile}
      />
      <AppSideBarContent />
      <AppSideBarFooter isMobile={isMobile} />
    </Sidebar>
  );
};
