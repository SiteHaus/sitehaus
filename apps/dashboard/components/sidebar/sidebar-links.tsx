import {
  Building2,
  ClipboardList,
  Contact,
  CreditCard,
  FolderKanban,
  Home,
  LucideIcon,
  Settings,
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
  /** Also visible for non-employee client contacts even without requirePerm */
  showForClients?: boolean;
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
        requirePerm: "tickets:manage",
      },
      {
        title: "Assigned To Me",
        url: "/tickets?assignedToMe=true",
        disabled: true,
      },
    ],
  },
  {
    title: "Billing",
    url: "/billing",
    icon: CreditCard,
    requirePerm: "billing:read",
    showForClients: true,
  },
  {
    title: "Business Profile",
    url: "/profile",
    icon: Building2,
    requireClient: true,
  },
  {
    title: "Clients",
    url: "/clients/all",
    icon: Contact,
    requirePerm: "members:read",
  },
  {
    title: "Audit Log",
    url: "/audit-logs",
    icon: ClipboardList,
    requirePerm: "audit:read",
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    requirePerm: "clients:read",
  },
];
