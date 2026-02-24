import {
  Building2,
  Contact,
  FolderKanban,
  Home,
  LucideIcon,
  Settings,
  Swords,
  Ticket,
  Wrench,
} from "lucide-react";

type SidebarMenuItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  subItems?: SidebarMenuItem[];
  disabled: boolean;
  requirePerm?: string;
  /** Only visible when the user is acting as a specific client (managedClientId is set) */
  requireClient?: boolean;
};

export const sideBarMenuItems: SidebarMenuItem[] = [
  {
    title: "Home",
    url: "/",
    icon: Home,
    disabled: false,
    isActive: false,
  },
  {
    title: "Projects",
    url: "/projects",
    icon: FolderKanban,
    disabled: false,
    isActive: false,
    subItems: [
      {
        title: "All Projects",
        url: "/projects",
        disabled: false,
      },
      {
        title: "New Project",
        url: "/projects/new",
        disabled: false,
        requirePerm: "projects:manage",
      },
    ],
  },
  {
    title: "Tickets",
    url: "/tickets",
    icon: Ticket,
    disabled: false,
    isActive: false,
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
    disabled: false,
    isActive: false,
    requireClient: true,
  },
  {
    title: "Clients",
    url: "/clients",
    icon: Contact,
    disabled: false,
    isActive: false,
    requirePerm: "members:read",
    subItems: [
      {
        title: "Client Directory",
        url: "/clients/all",
        disabled: false,
      },
    ],
  },
  {
    title: "Utilities",
    url: "#",
    icon: Wrench,
    disabled: true,
    isActive: false,
    requirePerm: "projects:manage",
    subItems: [
      {
        title: "Calendar",
        url: "#",
        disabled: true,
      },
      {
        title: "Automation Jobs",
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
    requirePerm: "roles:manage",
    subItems: [
      {
        title: "User Management",
        url: "#",
        disabled: true,
      },
      {
        title: "Audit Logs",
        url: "#",
        disabled: true,
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
        disabled: true,
      },
      {
        title: "Billing & Plans",
        url: "#",
        disabled: true,
      },
    ],
  },
];
