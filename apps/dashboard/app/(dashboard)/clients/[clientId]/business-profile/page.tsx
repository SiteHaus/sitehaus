"use client";

import type { BusinessProfileItem } from "@site-haus/contracts";
import { getApi } from "@site-haus/stores/api";
import { Badge } from "@site-haus/ui/components/base/badge";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@site-haus/ui/components/base/card";
import { Separator } from "@site-haus/ui/components/base/separator";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useIsEmployee } from "@/hooks/use-is-employee";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function computeCompleteness(profile: BusinessProfileItem) {
  const cp = (profile.currentPresence as Record<string, unknown> | null) ?? {};
  const social = (cp.social as Record<string, string> | undefined) ?? {};
  const hasOnline = !!(cp.website as string) || Object.keys(social).length > 0;
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

  return {
    filled: sections.filter((s) => s.done).length,
    total: sections.length,
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
}: {
  label?: string;
  value: string | null | undefined;
}) {
  return (
    <div className="space-y-1">
      {label && (
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      )}
      {value ? (
        <p className="text-sm leading-relaxed">{value}</p>
      ) : (
        <p className="text-sm italic text-muted-foreground">Not provided</p>
      )}
    </div>
  );
}

function LinkField({ label, value }: { label?: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      {label && (
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      )}
      {value ? (
        <a
          href={value.startsWith("http") ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          {value}
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      ) : (
        <p className="text-sm italic text-muted-foreground">Not provided</p>
      )}
    </div>
  );
}

function ColorSwatches({ colors }: { colors: string[] }) {
  if (!colors.length) {
    return <p className="text-sm italic text-muted-foreground">Not provided</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      {colors.map((color, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="h-6 w-6 rounded-full border shadow-sm"
            style={{ backgroundColor: color }}
          />
          <span className="font-mono text-xs text-muted-foreground">
            {color}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BusinessProfileReviewPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const router = useRouter();
  const isEmployee = useIsEmployee();

  const [profile, setProfile] = useState<BusinessProfileItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getApi().businessProfiles.getByClient({
        params: { clientId },
      });
      if (res.status === 200) setProfile(res.body.profile);
      else if (res.status === 404) setNotFound(true);
      else if (res.status === 403) setForbidden(true);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (!isEmployee) {
      router.replace("/");
      return;
    }
    fetchProfile();
  }, [isEmployee, fetchProfile, router]);

  if (!isEmployee) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="py-20 text-center">
        <h3 className="text-lg font-medium">Access Denied</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          You don&apos;t have permission to view this profile.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="space-y-4 py-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="py-16 text-center">
          <h3 className="text-lg font-medium">No Business Profile Yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            This client hasn&apos;t filled out their business profile yet.
          </p>
        </div>
      </div>
    );
  }

  const { filled, total } = computeCompleteness(profile);
  const pct = Math.round((filled / total) * 100);
  const cp = (profile.currentPresence as Record<string, unknown> | null) ?? {};
  const social = (cp.social as Record<string, string> | undefined) ?? {};
  const brandColors = (profile.brandColors as string[] | null) ?? [];
  const inspirationUrls = (profile.inspirationUrls as string[] | null) ?? [];

  const socialEntries = [
    { label: "Facebook", value: social.facebook },
    { label: "Instagram", value: social.instagram },
    { label: "Twitter / X", value: social.twitter },
    { label: "LinkedIn", value: social.linkedin },
    { label: "TikTok", value: social.tiktok },
    { label: "YouTube", value: social.youtube },
  ].filter((e) => e.value);

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-3" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{profile.businessName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Business Profile
              {profile.updatedAt && (
                <> · Last updated {formatDate(profile.updatedAt)}</>
              )}
            </p>
          </div>
          {profile.industry && (
            <Badge variant="secondary" className="shrink-0 mt-1">
              {profile.industry}
            </Badge>
          )}
        </div>

        {/* Completeness */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground shrink-0">
            {filled} of {total} sections complete
          </p>
        </div>
      </div>

      <Separator />

      {/* About */}
      <ProfileSection title="About">
        <div className="space-y-4">
          <Field label="Description" value={profile.description} />
        </div>
      </ProfileSection>

      {/* Their Customers */}
      <ProfileSection title="Their Customers">
        <div className="space-y-4">
          <Field label="Target Audience" value={profile.targetAudience} />
          <Field label="Competitors" value={profile.competitors} />
        </div>
      </ProfileSection>

      {/* Online Presence */}
      <ProfileSection title="Online Presence">
        <div className="space-y-4">
          <LinkField label="Website" value={cp.website as string} />
          {socialEntries.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {socialEntries.map((entry) => (
                <LinkField
                  key={entry.label}
                  label={entry.label}
                  value={entry.value}
                />
              ))}
            </div>
          )}
          {socialEntries.length === 0 && !cp.website && (
            <p className="text-sm italic text-muted-foreground">Not provided</p>
          )}
        </div>
      </ProfileSection>

      {/* Goals & Challenges */}
      <ProfileSection title="Goals & Challenges">
        <div className="space-y-4">
          <Field label="What they want to achieve" value={profile.goals} />
          <Field label="What's not working right now" value={profile.painPoints} />
        </div>
      </ProfileSection>

      {/* Branding */}
      <ProfileSection title="Branding">
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Logo</p>
            <p className="text-sm">
              {profile.hasLogo ? "Has an existing logo" : "Needs a logo designed"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Brand Colors
            </p>
            <ColorSwatches colors={brandColors} />
          </div>
          <Field label="Brand Fonts" value={profile.brandFonts} />
        </div>
      </ProfileSection>

      {/* Inspiration */}
      <ProfileSection title="Sites They Like">
        <div className="space-y-2">
          {inspirationUrls.length > 0 ? (
            inspirationUrls.map((url, i) => (
              <a
                key={i}
                href={url.startsWith("http") ? url : `https://${url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                {url}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            ))
          ) : (
            <p className="text-sm italic text-muted-foreground">Not provided</p>
          )}
        </div>
      </ProfileSection>

      {/* Additional Notes */}
      <ProfileSection title="Additional Notes">
        <Field value={profile.additionalNotes} />
      </ProfileSection>
    </div>
  );
}
