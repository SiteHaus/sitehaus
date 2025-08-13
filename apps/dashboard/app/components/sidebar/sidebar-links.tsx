import {
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
};

export const sideBarMenuItems: SidebarMenuItem[] = [
  {
    title: "Home",
    url: "#",
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
        title: "New Project",
        url: "/projects/new",
        disabled: false,
      },
      {
        title: "All Projects",
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
