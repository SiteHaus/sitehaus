"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@site-haus/ui/components/base/collapsible";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { useClientContext } from "../../hooks/use-client-context";
import { useIsEmployee } from "../../hooks/use-is-employee";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@site-haus/ui/components/base/sidebar";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sideBarMenuItems, type SidebarMenuItem as SidebarMenuItemType } from "./sidebar-links";

function isActive(pathname: string, url: string): boolean {
  if (url === "/" ) return pathname === "/";
  if (url === "#") return false;
  return pathname === url || pathname.startsWith(url + "/");
}

function isParentActive(pathname: string, item: SidebarMenuItemType): boolean {
  if (item.subItems?.some((sub) => isActive(pathname, sub.url))) return true;
  return isActive(pathname, item.url);
}

export const AppSideBarContent = () => {
  const pathname = usePathname();
  const hasPerm = useAuthStore((s) => s.hasPerm);
  const clientContext = useClientContext();
  const isEmployee = useIsEmployee();

  const visibleItems = sideBarMenuItems
    .filter((item) => {
      const permOk = !item.requirePerm || hasPerm(item.requirePerm);
      const clientFallback = !!item.showForClients && !isEmployee && !!clientContext;
      return permOk || clientFallback;
    })
    .filter((item) => !item.requireClient || !!clientContext)
    .map((item) => ({
      ...item,
      subItems: item.subItems?.filter(
        (sub) => !sub.requirePerm || hasPerm(sub.requirePerm),
      ),
    }));

  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Application</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {visibleItems.map((item) =>
              item.subItems && item.subItems.length > 0 ? (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={isParentActive(pathname, item)}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={isParentActive(pathname, item)}
                      >
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.subItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive(pathname, subItem.url)}
                            >
                              <Link href={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ) : (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isActive(pathname, item.url)}
                    asChild
                  >
                    <Link href={item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ),
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
};
