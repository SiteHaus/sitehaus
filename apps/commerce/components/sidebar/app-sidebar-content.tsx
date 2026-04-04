"use client";

import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@site-haus/ui/components/base/sidebar";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { sideBarMenuItems } from "./sidebar-links";

function isActive(pathname: string, url: string): boolean {
  if (url === "/") return pathname === url;
  return pathname === url || pathname.startsWith(url + "/");
}

export const AppSideBarContent = () => {
  const pathname = usePathname();
  const params = useParams<{ storeSlug?: string }>();
  const storeSlug = params?.storeSlug ?? "";

  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {sideBarMenuItems.map((item) => {
              const href = item.url === "/" ? `/${storeSlug}` : `/${storeSlug}${item.url}`;
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isActive(pathname, href)}
                    asChild
                  >
                    <Link href={href}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
};
