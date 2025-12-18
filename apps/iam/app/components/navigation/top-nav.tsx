"use client";

import { useAuthStore } from "@site-haus/stores/auth-store";
import { cn } from "@site-haus/ui/lib/utils";
import { AppWindow, Mail, Monitor, Shield, Users } from "lucide-react";
import Link from "next/link";
import { UserMenu } from "./user-menu";

interface NavLink {
  href: string;
  label: string;
  icon: React.ElementType;
  permission?: string | string[]; // Single permission or array of permissions (OR logic)
}

const mainNavLinks: NavLink[] = [
  {
    href: "/team",
    label: "Team",
    icon: Users,
    permission: ["members:read", "users:read"],
  },
  {
    href: "/invites",
    label: "Invites",
    icon: Mail,
    permission: "invites:read",
  },
  {
    href: "/roles",
    label: "Roles",
    icon: Shield,
    permission: "roles:read",
  },
  {
    href: "/sessions",
    label: "Sessions",
    icon: Monitor,
    permission: "sessions:read",
  },
];

export function TopNav() {
  const hasPerm = useAuthStore((s) => s.hasPerm);

  // Check if user has permission (supports single perm or array of perms with OR logic)
  const hasPermission = (permission?: string | string[]): boolean => {
    if (!permission) return true;
    if (Array.isArray(permission)) {
      return permission.some((perm) => hasPerm(perm));
    }
    return hasPerm(permission);
  };

  // Use roles:manage as temporary permission check for Apps
  // TODO: Add proper clients:manage permission
  const canManageApps = hasPerm("roles:manage");

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left: Logo + Main Nav Links */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-lg"
            >
              <Shield className="h-5 w-5" />
              <span>SiteHaus Identity</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {mainNavLinks.map((link) => {
                if (!hasPermission(link.permission)) return null;

                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium",
                      "hover:bg-accent hover:text-accent-foreground transition-colors"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right: Apps + User Menu */}
          <div className="flex items-center gap-4">
            {canManageApps && (
              <Link
                href="/apps"
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium",
                  "hover:bg-accent hover:text-accent-foreground transition-colors"
                )}
              >
                <AppWindow className="h-4 w-4" />
                Apps
              </Link>
            )}

            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}
