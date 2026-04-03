"use client";

import { useAuthStore } from "@site-haus/stores/auth-store";

export default function AdminHomePage() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.firstName ?? "there";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Welcome back, {firstName}</h1>
      <p className="text-muted-foreground">Manage your store from the sidebar.</p>
    </div>
  );
}
