import {
  SidebarProvider,
  SidebarTrigger,
} from "@site-haus/ui/components/base/sidebar";
import { cookies } from "next/headers";
import { ReactNode } from "react";
import { AppSideBar } from "../components/sidebar/sidebar";

export default async function ConsoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSideBar />
      <main>
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  );
}
