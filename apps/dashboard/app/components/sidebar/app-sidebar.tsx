"use client";

import { useAuthStore } from "@site-haus/stores/auth-store";
import { Sidebar, useSidebar } from "@site-haus/ui/components/base/sidebar";
import { AppSideBarContent } from "./app-sidebar-content";
import { AppSideBarFooter } from "./app-sidebar-footer";
import { AppSideBarHeader } from "./app-sidebar-header";

export const AppSideBar = () => {
  const { isMobile } = useSidebar();
  const session = useAuthStore((s) => s.session);

  return (
    <Sidebar variant="inset" collapsible="icon">
      <AppSideBarHeader
        userRole={session ? "admin" : undefined}
        isMobile={isMobile}
      />
      <AppSideBarContent />
      <AppSideBarFooter isMobile={isMobile} />
    </Sidebar>
  );
};
