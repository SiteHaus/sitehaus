"use client";

import { RequireAuth } from "@/lib/require-auth";
import { ClientContextBar } from "../../components/top-bar";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { SidebarInset, SidebarProvider } from "@site-haus/ui/components/base/sidebar";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { AppSideBar } from "../../components/sidebar/app-sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
            <ClientContextBar />
            <div className="px-4 md:px-6">{children}</div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </RequireAuth>
  );
}
