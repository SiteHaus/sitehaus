"use client";

import { RequireParams } from "@/lib/require-params";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import VerifyCodeContainer from "./verify-container";

function VerifyPage() {
  const searchParams = useSearchParams();
  const hasOAuthParams = !!searchParams.get("oauth_params");
  const hasClient = !!searchParams.get("client");

  return (
    <RequireParams
      requireClient={!hasOAuthParams && !hasClient}
      requireNext={false} // OAuth flow doesn't use 'next'
    >
      <VerifyCodeContainer />
    </RequireParams>
  );
}

export default function AuthVerifyCodeRoute() {
  return (
    <Suspense fallback={null}>
      <VerifyPage />
    </Suspense>
  );
}
