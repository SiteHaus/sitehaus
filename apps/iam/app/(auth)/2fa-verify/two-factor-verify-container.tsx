"use client";

import { useAuthNav } from "@/lib/auth-nav";
import { useApi } from "@/lib/typed-api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import type { Verify2faLoginInput } from "@site-haus/validation/forms/auth";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { TwoFactorVerifyForm } from "./form/two-factor-verify-form";

export default function TwoFactorVerifyContainer() {
  const { replace } = useAuthNav();
  const api = useApi();
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

    // Check if this is an OAuth flow — use sso-link form POST so the cookie
    // lands in the first-party api.localhost jar (Firefox TCP fix).
    if (oauthParams) {
      try {
        clearAuth();
        const form = document.createElement("form");
        form.method = "POST";
        form.action = `${process.env.NEXT_PUBLIC_API_URL}/auth/sso-link`;
        form.style.display = "none";
        const addField = (name: string, value: string) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = name;
          input.value = value;
          form.appendChild(input);
        };
        addField("accessToken", newToken);
        addField("oauthParams", oauthParams);
        document.body.appendChild(form);
        form.submit();
        return;
      } catch {
        // Fall through to normal redirect
      }
    }

    replace(next || "/");
  };

  const onCancel = () => {
    clearAuth();
    replace("/login");
  };

  if (!accessToken) {
    return null;
  }

  return <TwoFactorVerifyForm onSubmit={onSubmit} onCancel={onCancel} authForLabel={clientName} />;
}
