"use client";

import { RequireAuth } from "@/lib/require-auth";
import { useApi } from "@/lib/typed-api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { Suspense, useEffect } from "react";

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
  const api = useApi();
  const accessToken = useAuthStore((s) => s.accessToken);

  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!accessToken) return;
  }, [accessToken]);

  return (
    <RequireAuth>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Your Account</h1>
            <p className="text-muted-foreground">
              Manage your account details.
            </p>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
