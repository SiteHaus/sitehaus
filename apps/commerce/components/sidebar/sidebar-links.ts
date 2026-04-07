import {
  BarChart3,
  LayoutDashboard,
  Layers,
  LucideIcon,
  Package,
  Settings,
  ShoppingCart,
  Warehouse,
} from "lucide-react";

export type SidebarMenuItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
};

export const sideBarMenuItems: SidebarMenuItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Products",
    url: "/products",
    icon: Package,
  },
  {
    title: "Orders",
    url: "/orders",
    icon: ShoppingCart,
  },
  {
    title: "Collections",
    url: "/collections",
    icon: Layers,
  },
  {
    title: "Inventory",
    url: "/inventory",
    icon: Warehouse,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];
