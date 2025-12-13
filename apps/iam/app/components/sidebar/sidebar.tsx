import { Avatar, AvatarFallback } from "@site-haus/ui/components/base/avatar";
import { Separator } from "@site-haus/ui/components/base/separator";
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
} from "@site-haus/ui/components/base/sidebar";
import {
  HomeIcon,
  IdCardLanyard,
  LucideIcon,
  MailPlus,
  MonitorSmartphone,
  Users2,
} from "lucide-react";
import Link from "next/link";

type NavItem = { title: string; url: string; icon: LucideIcon };

const navItems: NavItem[] = [
  { title: "Overview", url: "/overview", icon: HomeIcon },
  { title: "Team", url: "/team", icon: Users2 },
  { title: "Invites", url: "/invites", icon: MailPlus },
  { title: "Roles & Permissions", url: "/roles", icon: IdCardLanyard },
  { title: "Sessions", url: "/sessions", icon: MonitorSmartphone },
];

export const AppSideBar = () => {
  return (
    <Sidebar>
      <SidebarHeader className="py-4">
        <SidebarMenuItem>
          <SidebarMenuButton>
            <Avatar className="bg-background border p-1">
              <AvatarFallback className="bg-background">
                <IdCardLanyard />
              </AvatarFallback>
            </Avatar>
            <span className="font-bold text-xl">IAM Gateway</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarHeader>

      <Separator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter>
        <p>Footer</p>
      </SidebarFooter>
    </Sidebar>
  );
};
