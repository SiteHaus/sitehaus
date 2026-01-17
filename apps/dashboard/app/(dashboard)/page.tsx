"use client";

import { useAuthStore } from "@site-haus/stores/auth-store";

export default function Home() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold">
        Welcome back{user?.firstName ? `, ${user.firstName}` : ""}!
      </h1>
      <p className="text-muted-foreground mt-2">
        This is your SiteHaus Dashboard.
      </p>
    </div>
  );
}
