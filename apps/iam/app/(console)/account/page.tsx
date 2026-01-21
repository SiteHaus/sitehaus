"use client";

import { RequireAuth } from "@/lib/require-auth";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { Suspense } from "react";
import { DeleteSection } from "./components/delete-section";
import { PasswordSection } from "./components/password-section";
import { ProfileSection } from "./components/profile-section";
import { TotpSection } from "./components/totp-section";

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <Spinner className="size-6" />
        </div>
      }
    >
      <AccountPageContent />
    </Suspense>
  );
}

function AccountPageContent() {
  const user = useAuthStore((s) => s.user);

  return (
    <RequireAuth>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Your Account</h1>
          <p className="text-muted-foreground">
            Manage your account settings and security.
          </p>
        </div>

        {user && (
          <div className="space-y-6 max-w-2xl">
            <ProfileSection />
            <PasswordSection />
            <TotpSection />
            <DeleteSection />
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
