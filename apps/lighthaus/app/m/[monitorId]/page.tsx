"use client";

import { use } from "react";
import { RequireAuth } from "@/lib/require-auth";
import { MonitorDetail } from "./_components/monitor-detail";

export default function MonitorPage({ params }: { params: Promise<{ monitorId: string }> }) {
  const { monitorId } = use(params);

  return (
    <RequireAuth>
      <main className="mx-auto min-h-screen w-full max-w-3xl p-6 sm:p-8">
        <MonitorDetail monitorId={monitorId} />
      </main>
    </RequireAuth>
  );
}
