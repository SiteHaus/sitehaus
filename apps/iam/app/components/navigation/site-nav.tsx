"use client";

import { generatePKCE } from "@site-haus/sdk/oauth";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { Button } from "@site-haus/ui/components/base/button";
import { cn } from "@site-haus/ui/lib/utils";
import {
  AppWindow,
  HelpCircle,
  LogIn,
  Mail,
  Monitor,
  Shield,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { UserMenu } from "./user-menu";

interface NavLink {
  href: string;
  label: string;
  icon: React.ElementType;
  permission?: string | string[];
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

export function SiteNav() {
  const user = useAuthStore((s) => s.user);
  const hasPerm = useAuthStore((s) => s.hasPerm);

  const hasPermission = (permission?: string | string[]): boolean => {
    if (!permission) return true;
    if (Array.isArray(permission)) {
      return permission.some((perm) => hasPerm(perm));
    }
    return hasPerm(permission);
  };

  const handleLogin = async () => {
    const { codeVerifier, codeChallenge } = await generatePKCE();
    const state = Math.random().toString(36).substring(7);

    sessionStorage.setItem("oauth_code_verifier", codeVerifier);
    sessionStorage.setItem("oauth_state", state);

    const params = new URLSearchParams({
      client_key: process.env.NEXT_PUBLIC_CLIENT_KEY!,
      redirect_uri: `${window.location.origin}/callback`,
      response_type: "code",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      scope: "openid profile email",
      state,
    });

    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/authorize?${params}`;
  };

  const canManageApps = hasPerm("roles:manage");

  return (
    <nav className="border-b bg-background/70">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/sitehaus-icon.svg"
                width={25}
                height={25}
                alt="Sitehaus"
              />
              <span className="text-xl font-bold">SH-IAM</span>
            </Link>

            {/* Authed: Nav Links */}
            {user && (
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
            )}
          </div>

          {/* Right: Auth-dependent content */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
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
              </>
            ) : (
              <>
                <Button variant="outline" className="bg-card">
                  Need Help
                  <HelpCircle />
                </Button>
                <Button onClick={handleLogin}>
                  Log In <LogIn />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
