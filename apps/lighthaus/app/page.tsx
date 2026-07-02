"use client";

import { RequireAuth } from "@/lib/require-auth";

export default function HomePage() {
  return (
    <RequireAuth>
      <main className="min-h-screen p-8">
        <h1 className="text-2xl font-semibold">SiteHaus Status</h1>
        <p className="mt-2 text-muted-foreground">Status board loading…</p>
      </main>
    </RequireAuth>
  );
}
