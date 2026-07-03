"use client";

import { useAuthStore } from "@site-haus/stores/auth-store";
import { Button } from "@site-haus/ui/components/base/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@site-haus/ui/components/base/dropdown-menu";
import { APPS, getAppUrl } from "@site-haus/ui/lib/apps";
import { ExternalLink, Grid2x2, LogOut } from "lucide-react";

const CURRENT_APP = "status";

// Top-right cluster for the status board: switch to another SiteHaus app, or log
// out of the shared SSO session (revokes server-side, then bounces to login).
export const StatusHeaderActions = () => {
  const logout = useAuthStore((s) => s.logout);

  const onLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Switch app">
            <Grid2x2 className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={4} className="min-w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Switch app
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {APPS.map((app) => {
            const isCurrent = app.id === CURRENT_APP;
            const inner = (
              <>
                <div
                  className={`flex aspect-square size-6 items-center justify-center rounded text-xs font-bold ${
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {app.initials}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{app.label}</p>
                  <p className="text-xs text-muted-foreground">{app.subtitle}</p>
                </div>
                {!isCurrent && <ExternalLink className="size-3 text-muted-foreground" />}
              </>
            );
            return (
              <DropdownMenuItem key={app.id} disabled={isCurrent} asChild={!isCurrent}>
                {isCurrent ? (
                  <div className="flex items-center gap-2">{inner}</div>
                ) : (
                  <a href={getAppUrl(app.id)} className="flex items-center gap-2">
                    {inner}
                  </a>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="ghost" size="icon" aria-label="Log out" onClick={onLogout}>
        <LogOut className="size-4" />
      </Button>
    </div>
  );
};
