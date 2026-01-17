"use client";

import { RequireAuth } from "@/lib/require-auth";
import { useAuthStore } from "@site-haus/stores/auth-store";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@site-haus/ui/components/base/sidebar";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { AppSideBar } from "../components/sidebar/app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hydrated = useAuthStore((s) => s.hydrated);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  return (
    <RequireAuth>
      <SidebarProvider>
        <AppSideBar />
        <SidebarInset>
          <main>
            <SidebarTrigger className="ml-6 lg:ml-2 mt-2" />
            <div className="px-6 lg:px-0">{children}</div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </RequireAuth>
  );
}
