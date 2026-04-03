import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@site-haus/ui/components/base/sidebar";

export const AppSideBarHeader = () => {
  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="cursor-default">
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg text-xs font-bold tracking-tight">
              EC
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-bold">Commerce</span>
              <span className="truncate text-xs text-sidebar-foreground/50 font-normal">
                Store Admin
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
};
