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

function isActive(pathname: string, href: string, isRoot: boolean): boolean {
  if (isRoot) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
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
                    isActive={isActive(pathname, href, item.url === "/")}
                    asChild
                    className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
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
