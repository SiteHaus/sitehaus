"use client";

import { RequireAuth } from "@/lib/require-auth";
import { AppSideBar } from "../../../components/sidebar/app-sidebar";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { SidebarInset, SidebarProvider } from "@site-haus/ui/components/base/sidebar";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { useParams } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const managedClientId = useAuthStore((s) => s.managedClientId);
  const setManagedClientId = useAuthStore((s) => s.setManagedClientId);
  const params = useParams();
  const slug = params.storeSlug as string;

  // Restore managedClientId from sessionStorage on reload, keyed by slug
  useEffect(() => {
    if (!managedClientId) {
      const stored = sessionStorage.getItem(`commerce_client:${slug}`);
      if (stored) setManagedClientId(stored);
    }
  }, []);

  // Persist managedClientId to sessionStorage keyed by slug
  useEffect(() => {
    if (managedClientId && slug) {
      sessionStorage.setItem(`commerce_client:${slug}`, managedClientId);
    }
  }, [managedClientId, slug]);

  if (!bootstrapped) {
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
            <div className="px-4 md:px-6 py-6">{children}</div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </RequireAuth>
  );
}
