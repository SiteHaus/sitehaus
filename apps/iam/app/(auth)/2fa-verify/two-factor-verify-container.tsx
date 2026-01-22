"use client";

import { useAuthNav } from "@/lib/auth-nav";
import { useApi } from "@/lib/typed-api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import type { Verify2faLoginInput } from "@site-haus/validation/forms/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { TwoFactorVerifyForm } from "./form/two-factor-verify-form";

export default function TwoFactorVerifyContainer() {
  const { replace } = useAuthNav();
  const api = useApi();
  const router = useRouter();
  const searchParams = useSearchParams();

  const next = searchParams.get("next") || "/";
  const clientName = searchParams.get("client") || "";
  const oauthParams = searchParams.get("oauth_params");

  const accessToken = useAuthStore((s) => s.accessToken);
  const setAccess = useAuthStore((s) => s.setAccess);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  // Redirect to login if no partial token exists
  useEffect(() => {
    if (!accessToken) {
      replace("/login");
    }
  }, [accessToken, replace]);

  const onSubmit = async (values: Verify2faLoginInput) => {
    const r = await api.auth.loginOnly.verify2faLogin({ body: values });

    if (r.status !== 200) throw r;

    const { accessToken: newToken, accessTokenExpiresIn } = r.body;

    const exp = Math.floor(Date.now() / 1000) + accessTokenExpiresIn;
    setAccess({ accessToken: newToken, accessExpiration: exp });

    // Hydrate user/session/permissions
    try {
      await useAuthStore.getState().me();
    } catch {
      // Continue with redirect even if me() fails - user is authenticated
    }

    // Check if this is an OAuth flow
    if (oauthParams) {
      try {
        // Decode the OAuth parameters
        const params = JSON.parse(
          atob(oauthParams.replace(/-/g, "+").replace(/_/g, "/"))
        );

        // Build the authorize URL with the original OAuth params
        const authorizeUrl = new URL(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/authorize`
        );

        Object.entries(params).forEach(([key, value]) => {
          if (value) {
            authorizeUrl.searchParams.set(key, value as string);
          }
        });

        // Redirect to the API authorize endpoint
        // The browser will automatically send the refresh token cookie
        window.location.href = authorizeUrl.toString();
        return;
      } catch {
        // Fall through to normal redirect
      }
    }

    router.replace(next || "/");
  };

  const onCancel = () => {
    clearAuth();
    replace("/login");
  };

  if (!accessToken) {
    return null;
  }

  return (
    <TwoFactorVerifyForm
      onSubmit={onSubmit}
      onCancel={onCancel}
      authForLabel={clientName}
    />
  );
}
