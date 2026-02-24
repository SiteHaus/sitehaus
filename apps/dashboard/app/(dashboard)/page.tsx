"use client";

import { getApi } from "@site-haus/stores/api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { useClientContext } from "../../hooks/use-client-context";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@site-haus/ui/components/base/card";
import { Building2, FolderKanban, Plus, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const managedClientId = useAuthStore((s) => s.managedClientId);
  const hasPerm = useAuthStore((s) => s.hasPerm);
  const clientContext = useClientContext();

  const [showSetupCard, setShowSetupCard] = useState(false);

  const dismissKey = managedClientId
    ? `profile_setup_dismissed_${managedClientId}`
    : null;

  const checkProfile = useCallback(async () => {
    if (!clientContext) return;
    if (dismissKey && localStorage.getItem(dismissKey) === "true") return;

    try {
      const res = await getApi().businessProfiles.getMe();
      if (res.status === 404) {
        setShowSetupCard(true);
      }
    } catch {
      // skip silently
    }
  }, [clientContext, dismissKey]);

  useEffect(() => {
    checkProfile();
  }, [checkProfile]);

  const handleDismiss = () => {
    if (dismissKey) localStorage.setItem(dismissKey, "true");
    setShowSetupCard(false);
  };

  return (
    <div className="mx-auto max-w-5xl py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ""}!
        </h1>
        <p className="text-muted-foreground mt-2">
          This is your SiteHaus Dashboard.
        </p>
      </div>

      {showSetupCard && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    Complete your business profile
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Add your brand, goals, and a bit about your company so we
                    can hit the ground running.
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button asChild size="sm">
                  <Link href="/profile">Set up now</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleDismiss}
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/projects">
          <Card className="transition-colors hover:border-primary/40 h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Projects</CardTitle>
                  <CardDescription>View and manage projects</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        {hasPerm("projects:manage") && (
          <Link href="/projects/new">
            <Card className="transition-colors hover:border-primary/40 h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">New Project</CardTitle>
                    <CardDescription>Create a new web project</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        )}

        {clientContext && (
          <Link href="/profile">
            <Card className="transition-colors hover:border-primary/40 h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Business Profile</CardTitle>
                    <CardDescription>
                      Your brand and business details
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        )}

      </div>
    </div>
  );
}
