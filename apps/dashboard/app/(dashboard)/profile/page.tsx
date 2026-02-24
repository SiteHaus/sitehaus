"use client";

import { getApi } from "@site-haus/stores/api";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import type { BusinessProfileItem } from "@site-haus/contracts";
import { useCallback, useEffect, useState } from "react";
import { useClientContext } from "../../../hooks/use-client-context";
import { ProfileForm } from "./_components/profile-form";

export default function ProfilePage() {
  const clientContext = useClientContext();
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
    fetchProfile();
  }, [fetchProfile]);

  const handleSaved = (saved: BusinessProfileItem) => {
    setProfile(saved);
    setMode("edit");
  };

  if (!clientContext) {
    return (
      <div className="mx-auto max-w-2xl py-6 space-y-2">
        <h1 className="text-3xl font-bold">Business Profile</h1>
        <p className="text-muted-foreground">
          Business profiles are tied to a client organization. Select a client context to view or edit a profile.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Business Profile</h1>
        <p className="text-muted-foreground mt-1">
          Help us understand your business so we can build something great together.
        </p>
      </div>
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
