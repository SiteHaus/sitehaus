"use client";

import { Sidebar, useSidebar } from "@site-haus/ui/components/base/sidebar";
import { AppSideBarContent } from "./app-sidebar-content";
import { AppSideBarFooter } from "./app-sidebar-footer";
import { AppSideBarHeader } from "./app-sidebar-header";

export const AppSideBar = () => {
  const { isMobile } = useSidebar();

  return (
    <Sidebar variant="inset" collapsible="icon">
      <AppSideBarHeader />
      <AppSideBarContent />
      <AppSideBarFooter isMobile={isMobile} />
    </Sidebar>
  );
};
