"use client";

import { Avatar, AvatarFallback } from "@site-haus/ui/components/base/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@site-haus/ui/components/base/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@site-haus/ui/components/base/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@site-haus/ui/components/base/sidebar";
import {
  BadgeCheck,
  Bell,
  ChevronRight,
  ChevronsUpDown,
  Contact,
  CreditCard,
  FolderKanban,
  Home,
  Library,
  LogOut,
  LucideIcon,
  Plus,
  Settings,
  Sparkles,
  Swords,
  Ticket,
  Wrench,
} from "lucide-react";
import Link from "next/link";

type SidebarMenuItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  subItems?: SidebarMenuItem[];
  disabled: boolean;
};

const items: SidebarMenuItem[] = [
  {
    title: "Home",
    url: "#",
    icon: Home,
    disabled: false,
    isActive: false,
  },
  {
    title: "Projects",
    url: "#",
    icon: FolderKanban,
    disabled: false,
    isActive: false,
    subItems: [
      {
        title: "New Project",
        url: "#",
        disabled: false,
      },
      {
        title: "Design Assets",
        url: "#",
        disabled: true,
      },
      {
        title: "Project Templates",
        url: "#",
        disabled: true,
      },
    ],
  },
  {
    title: "Tickets",
    url: "#",
    icon: Ticket,
    disabled: false,
    isActive: false,
    subItems: [
      {
        title: "All Tickets",
        url: "#",
        disabled: true,
      },
      {
        title: "Assigned To Me",
        url: "#",
        disabled: true,
      },
      {
        title: "Ticket Categories",
        url: "#",
        disabled: true,
      },
    ],
  },
  {
    title: "Clients",
    url: "#",
    icon: Contact,
    disabled: false,
    isActive: false,
    subItems: [
      {
        title: "Client Directory",
        url: "#",
        disabled: false,
      },
      {
        title: "New Client",
        url: "#",
        disabled: false,
      },
      {
        title: "Billing Info",
        url: "#",
        disabled: false,
      },
    ],
  },
  {
    title: "Utilities",
    url: "#",
    icon: Wrench,
    disabled: false,
    isActive: false,
    subItems: [
      {
        title: "Calendar",
        url: "#",
        disabled: false,
      },
      {
        title: "Automation Jobs",
        url: "#",
        disabled: false,
      },
      {
        title: "Forms & Surveys",
        url: "#",
        disabled: true,
      },
    ],
  },
  {
    title: "Admin",
    url: "#",
    icon: Swords,
    disabled: false,
    isActive: false,
    subItems: [
      {
        title: "User Management",
        url: "#",
        disabled: false,
      },
      {
        title: "Audit Logs",
        url: "#",
        disabled: false,
      },
      {
        title: "System Notifications",
        url: "#",
        disabled: false,
      },
    ],
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
    disabled: false,
    isActive: false,
    subItems: [
      {
        title: "Company Info",
        url: "#",
        disabled: false,
      },
      {
        title: "Billing & Plans",
        url: "#",
        disabled: false,
      },
      {
        title: "Integrations",
        url: "#",
        disabled: false,
      },
    ],
  },
];

export const AppSideBar = () => {
  const { isMobile } = useSidebar();

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <FolderKanban className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">Project 1</span>
                    <span className="truncate text-xs">Enterprise</span>
                  </div>
                  <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                align="start"
                side={isMobile ? "bottom" : "right"}
                sideOffset={4}
              >
                <DropdownMenuLabel className="text-muted-foreground text-xs">
                  Projects
                </DropdownMenuLabel>
                <DropdownMenuItem className="gap-2 p-2">
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <Library className="size-3.5 shrink-0" />
                  </div>
                  Project 1<DropdownMenuShortcut>⌘ 1</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 p-2">
                  <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                    <Plus className="size-4" />
                  </div>
                  <div className="text-muted-foreground font-medium">
                    Add project
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) =>
                item.subItems ? (
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={item.isActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem key={item.title}>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title} asChild>
                          <Link href={item.url}>
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </Link>
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.subItems?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild>
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
                      disabled={item.disabled}
                      asChild
                    >
                      <Link href={item.url}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  variant="outline"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground border shadow-accent"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">LB</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">Luna Bear</span>
                    <span className="truncate text-xs">lunabear@gmail.com</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">LB</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">Luna Bear</span>
                      <span className="truncate text-xs">
                        lunabear@gmail.com
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <Sparkles />
                    Upgrade to Pro
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <BadgeCheck />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CreditCard />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Bell />
                    Notifications
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
