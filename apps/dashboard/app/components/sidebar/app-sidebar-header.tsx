import { Project, UserRole } from "@site-haus/db/types";
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
import {
  ChevronsUpDown,
  FolderKanban,
  LayoutDashboard,
  Library,
  Plus,
} from "lucide-react";
import { useState } from "react";

interface AppSideBarHeaderProps {
  isMobile: boolean;
  userRole?: UserRole;
  projects?: Project[];
  currentProjectId?: string;
}

export const AppSideBarHeader = ({
  isMobile,
  userRole,
  projects,
  currentProjectId,
}: AppSideBarHeaderProps) => {
  const [selectedProjectId, setSelectedProjectId] = useState(
    currentProjectId ?? projects?.[0]?.id
  );

  const currentProject = projects?.find((p) => p.id === selectedProjectId);

  if (userRole === "client") {
    if (!projects) {
      return null;
    }

    return (
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
                    <span className="truncate font-medium">
                      {currentProject?.name || "Select Project"}
                    </span>
                    <span className="truncate text-xs capitalize">
                      {currentProject?.type || ""}
                    </span>
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
                {projects.map((project) => (
                  <DropdownMenuItem
                    key={project.id}
                    className="gap-2 p-2"
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border">
                      <Library className="size-3.5 shrink-0" />
                    </div>
                    {project.name}
                  </DropdownMenuItem>
                ))}
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
    );
  }

  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="cursor-default">
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <LayoutDashboard className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-bold">SiteHaus</span>
              <span className="truncate text-xs text-muted-foreground capitalize">
                {userRole}
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
};
