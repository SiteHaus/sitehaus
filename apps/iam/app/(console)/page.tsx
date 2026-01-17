"use client";

import { RequireAuth } from "@/lib/require-auth";
import { useAuthStore } from "@site-haus/stores/auth-store";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <RequireAuth>
      <div className="container mx-auto mt-12">
        <h1 className="text-3xl font-bold mb-4">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-muted-foreground mb-8">
          Manage your identity and access settings
        </p>
      </div>
    </RequireAuth>
  );
}
