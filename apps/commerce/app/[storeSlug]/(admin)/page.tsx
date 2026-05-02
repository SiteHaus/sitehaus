"use client";

import { useAuthStore } from "@site-haus/stores/auth-store";
import { DashboardView } from "./_components/dashboard-view";

export default function AdminHomePage() {
  const firstName = useAuthStore((s) => s.user?.firstName ?? "there");
  return <DashboardView firstName={firstName} />;
}
