import {
  Building2,
  Contact,
  FolderKanban,
  Home,
  LucideIcon,
  Ticket,
} from "lucide-react";

export type SidebarMenuItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: SidebarMenuItem[];
  disabled?: boolean;
  requirePerm?: string;
  /** Only visible when the user is acting as a specific client (managedClientId is set) */
  requireClient?: boolean;
};

export const sideBarMenuItems: SidebarMenuItem[] = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "Projects",
    url: "/projects",
    icon: FolderKanban,
    subItems: [
      {
        title: "All Projects",
        url: "/projects",
      },
      {
        title: "New Project",
        url: "/projects/new",
        requirePerm: "projects:manage",
      },
    ],
  },
  {
    title: "Tickets",
    url: "/tickets",
    icon: Ticket,
    subItems: [
      {
        title: "All Tickets",
        url: "/tickets",
        disabled: true,
      },
      {
        title: "Assigned To Me",
        url: "#",
        disabled: true,
      },
    ],
  },
  {
    title: "Business Profile",
    url: "/profile",
    icon: Building2,
    requireClient: true,
  },
  {
    title: "Clients",
    url: "/clients",
    icon: Contact,
    requirePerm: "members:read",
    subItems: [
      {
        title: "Client Directory",
        url: "/clients/all",
      },
    ],
  },
];
