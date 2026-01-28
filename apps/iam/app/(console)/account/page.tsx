"use client";

import { ConsolePageWrapper } from "@/app/components/console-page-wrapper";
import { PageHeader } from "@/app/components/page-header";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { DeleteSection } from "./components/delete-section";
import { PasswordSection } from "./components/password-section";
import { ProfileSection } from "./components/profile-section";
import { TotpSection } from "./components/totp-section";

export default function AccountPage() {
  return (
    <ConsolePageWrapper maxWidth="2xl" className="px-4 py-8 mt-0">
      <AccountPageContent />
    </ConsolePageWrapper>
  );
}

function AccountPageContent() {
  const user = useAuthStore((s) => s.user);

  return (
    <>
      <PageHeader
        title="Your Account"
        description="Manage your account settings and security."
        className="mb-6"
      />

      {user && (
        <div className="space-y-6">
          <ProfileSection />
          <PasswordSection />
          <TotpSection />
          <DeleteSection />
        </div>
      )}
    </>
  );
}
