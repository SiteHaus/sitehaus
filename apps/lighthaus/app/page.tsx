"use client";

import { RequireAuth } from "@/lib/require-auth";
import { StatusBoard } from "./_components/status-board";

export default function HomePage() {
  return (
    <RequireAuth>
      <main className="mx-auto min-h-screen w-full max-w-3xl p-6 sm:p-8">
        <StatusBoard />
      </main>
    </RequireAuth>
  );
}
