"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@site-haus/ui/components/base/dropdown-menu";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@site-haus/ui/components/base/sidebar";
import { APPS, getAppUrl } from "@site-haus/ui/lib/apps";
import { ChevronsUpDown, ExternalLink } from "lucide-react";

const CURRENT_APP = "dashboard";

export const AppSideBarHeader = () => {
  const current = APPS.find((a) => a.id === CURRENT_APP)!;

  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg text-xs font-bold tracking-tight">
                  {current.initials}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold">{current.label}</span>
                  <span className="truncate text-xs text-sidebar-foreground/50 font-normal">
                    {current.subtitle}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/50" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side="bottom"
              align="start"
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Switch app
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {APPS.map((app) => (
                <DropdownMenuItem
                  key={app.id}
                  disabled={app.id === CURRENT_APP}
                  asChild={app.id !== CURRENT_APP}
                >
                  {app.id === CURRENT_APP ? (
                    <div className="flex items-center gap-2">
                      <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-6 items-center justify-center rounded text-xs font-bold">
                        {app.initials}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{app.label}</p>
                        <p className="text-xs text-muted-foreground">{app.subtitle}</p>
                      </div>
                    </div>
                  ) : (
                    <a href={getAppUrl(app.id)} className="flex items-center gap-2">
                      <div className="bg-muted text-muted-foreground flex aspect-square size-6 items-center justify-center rounded text-xs font-bold">
                        {app.initials}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{app.label}</p>
                        <p className="text-xs text-muted-foreground">{app.subtitle}</p>
                      </div>
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </a>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
};
