"use client";

import { RequireParams } from "@/lib/require-params";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import RequestPasswordResetContainer from "./request-password-reset-container";

function RequestPasswordPage() {
  const searchParams = useSearchParams();
  const hasOAuthParams = !!searchParams.get("oauth_params");
  const hasClient = !!searchParams.get("client");

  return (
    <RequireParams
      requireClient={!hasOAuthParams && !hasClient}
      requireNext={false} // OAuth flow doesn't use 'next'
    >
      <RequestPasswordResetContainer />
    </RequireParams>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <RequestPasswordPage />
    </Suspense>
  );
}
