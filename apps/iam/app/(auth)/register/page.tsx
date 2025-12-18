"use client";

import { RequireParams } from "@/lib/require-params";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import RegisterContainer from "./register-container";

function RegisterPage() {
  const searchParams = useSearchParams();
  const hasOAuthParams = !!searchParams.get("oauth_params");
  const hasClient = !!searchParams.get("client");

  return (
    <RequireParams
      requireClient={!hasOAuthParams && !hasClient}
      requireNext={false} // OAuth flow doesn't use 'next'
    >
      <RegisterContainer />
    </RequireParams>
  );
}

export default function AuthRegisterRoute() {
  return (
    <Suspense fallback={null}>
      <RegisterPage />
    </Suspense>
  );
}
