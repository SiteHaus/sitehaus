"use client";

import { RequireParams } from "@/lib/require-params";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import LoginContainer from "./login-container";

function LoginPage() {
  const searchParams = useSearchParams();
  const hasOAuthParams = !!searchParams.get("oauth_params");
  const hasClient = !!searchParams.get("client");

  return (
    <RequireParams
      requireClient={!hasOAuthParams && !hasClient}
      requireNext={false} // OAuth flow doesn't use 'next'
    >
      <LoginContainer />
    </RequireParams>
  );
}

export default function AuthLoginRoute() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}
