"use client";

import { RequireParams } from "@/lib/require-params";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ConsentContainer from "./consent-container";

function ConsentPage() {
  const searchParams = useSearchParams();
  // Consent is always accessed from OAuth flow, which provides client param
  // But we'll check for it to be safe
  const hasClient = !!searchParams.get("client");

  return (
    <RequireParams requireClient={!hasClient}>
      <ConsentContainer />
    </RequireParams>
  );
}

export default function AuthConsentRoute() {
  return (
    <Suspense fallback={null}>
      <ConsentPage />
    </Suspense>
  );
}
