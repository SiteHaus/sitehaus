"use client";

import type { BusinessProfileItem, MeClient } from "@site-haus/contracts";
import { getApi } from "@site-haus/stores/api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@site-haus/ui/components/base/card";
import { Separator } from "@site-haus/ui/components/base/separator";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  FolderKanban,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useClients } from "@/hooks/use-clients";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";

interface ClientDetailViewProps {
  clientId: string;
}

export function ClientDetailView({ clientId }: ClientDetailViewProps) {
  const router = useRouter();
  const setManagedClientId = useAuthStore((s) => s.setManagedClientId);
  const me = useAuthStore((s) => s.me);
  const [enteringContext, setEnteringContext] = useState(false);

  const { data: clients, isLoading: clientsLoading } = useClients();
  const client = clients?.find((c) => c.id === clientId);

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: queryKeys.businessProfile.byClient(clientId),
    queryFn: async () => {
      const res = await getApi().businessProfiles.getByClient({
        params: { clientId },
      });
      if (res.status === 200) return res.body.profile;
      return null;
    },
  });

  const handleManageAsClient = async () => {
    setEnteringContext(true);
    setManagedClientId(clientId);
    await me();
    router.push("/");
  };

  const isLoading = clientsLoading || profileLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="py-6 space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/clients/all">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Link>
        </Button>
        <div className="py-16 text-center">
          <h3 className="text-lg font-medium">Client not found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            This client doesn&apos;t exist or you don&apos;t have access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-6">
      {/* Back */}
      <Button variant="ghost" size="sm" className="-ml-2" asChild>
        <Link href="/clients/all">
          <ArrowLeft className="mr-2 h-4 w-4" />
          All Clients
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted font-bold text-lg">
            {client.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">{client.name}</h1>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              {client.key}
            </p>
          </div>
        </div>
        <Button
          onClick={handleManageAsClient}
          disabled={enteringContext}
          size="sm"
        >
          {enteringContext ? (
            <Spinner className="size-3.5 mr-2" />
          ) : (
            <UserCog className="mr-2 h-3.5 w-3.5" />
          )}
          Manage as Client
        </Button>
      </div>

      <Separator />

      {/* Business Profile */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Business Profile</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/clients/${clientId}/business-profile`}>
              View full profile
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {profileData ? (
          <Card>
            <CardContent className="pt-4 space-y-4">
              {/* Completeness bar */}
              <ProfileCompleteness profile={profileData} />

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                {profileData.industry && (
                  <ProfileField label="Industry" value={profileData.industry} />
                )}
                {profileData.description && (
                  <ProfileField
                    label="About"
                    value={profileData.description}
                    truncate
                  />
                )}
                {profileData.goals && (
                  <ProfileField
                    label="Goals"
                    value={profileData.goals}
                    truncate
                  />
                )}
                {profileData.targetAudience && (
                  <ProfileField
                    label="Target Audience"
                    value={profileData.targetAudience}
                    truncate
                  />
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border">
            <Building2 className="mb-3 h-7 w-7 text-muted-foreground/40" />
            <p className="text-sm font-medium">No business profile yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              This client hasn&apos;t filled out their profile yet.
            </p>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-base font-semibold mb-3">Quick Links</h2>
        <div className="rounded-lg border overflow-hidden">
          {[
            {
              icon: FolderKanban,
              label: "Projects",
              href: `/projects`,
              description: "View all projects for this client",
            },
            {
              icon: BadgeCheck,
              label: "Full Business Profile",
              href: `/clients/${clientId}/business-profile`,
              description: "All intake details, branding, and goals",
            },
          ].map(({ icon: Icon, label, href, description }, i, arr) => (
            <Link key={label} href={href}>
              <div
                className={`flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors cursor-pointer ${
                  i < arr.length - 1 ? "border-b" : ""
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileCompleteness({ profile }: { profile: BusinessProfileItem }) {
  const cp = (profile.currentPresence as Record<string, unknown> | null) ?? {};
  const social = (cp.social as Record<string, string> | undefined) ?? {};
  const hasOnline =
    !!(cp.website as string) || Object.keys(social).length > 0;
  const colors = (profile.brandColors as string[] | null) ?? [];
  const urls = (profile.inspirationUrls as string[] | null) ?? [];

  const sections = [
    { label: "Description", done: !!profile.description },
    { label: "Target Audience", done: !!profile.targetAudience },
    { label: "Online Presence", done: hasOnline },
    { label: "Goals", done: !!profile.goals },
    { label: "Challenges", done: !!profile.painPoints },
    { label: "Branding", done: colors.length > 0 || !!profile.brandFonts },
    { label: "Inspiration", done: urls.length > 0 },
  ];

  const filled = sections.filter((s) => s.done).length;
  const pct = Math.round((filled / sections.length) * 100);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground shrink-0">
        {filled} of {sections.length} sections complete
      </p>
    </div>
  );
}

function ProfileField({
  label,
  value,
  truncate,
}: {
  label: string;
  value: string;
  truncate?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`text-sm leading-relaxed ${truncate ? "line-clamp-2" : ""}`}>
        {value}
      </p>
    </div>
  );
}
