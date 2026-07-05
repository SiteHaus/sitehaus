"use client";

import { getApi } from "@site-haus/stores/api";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import type { BusinessProfileItem } from "@site-haus/contracts";
import { useCallback, useEffect, useState } from "react";
import { useClientContext } from "../../../hooks/use-client-context";
import { useIsEmployee } from "../../../hooks/use-is-employee";
import { useRouter } from "next/navigation";
import { ProfileForm } from "./_components/profile-form";
import { Building2 } from "lucide-react";
import { PageHero } from "@site-haus/ui/components/shared/page-hero";

export default function ProfilePage() {
  const clientContext = useClientContext();
  const isEmployee = useIsEmployee();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<BusinessProfileItem | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getApi().businessProfiles.getMe();
      if (res.status === 200) {
        setProfile(res.body.profile);
        setMode("edit");
      }
    } catch {
      // stays in create mode
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isEmployee && clientContext) {
      router.replace(`/clients/${clientContext.id}/business-profile`);
      return;
    }
    fetchProfile();
  }, [isEmployee, clientContext, router, fetchProfile]);

  const handleSaved = (saved: BusinessProfileItem) => {
    setProfile(saved);
    setMode("edit");
  };

  if (!clientContext) {
    return (
      <div className="mx-auto max-w-2xl space-y-2">
        <PageHero
          icon={Building2}
          title="Business Profile"
          subtitle="Business profiles are tied to a client organization. Select a client context to view or edit a profile."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHero
        icon={Building2}
        title="Business Profile"
        subtitle="Help us understand your business so we can build something great together."
      />
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <ProfileForm key={mode} profile={profile} mode={mode} onSaved={handleSaved} />
      )}
    </div>
  );
}
