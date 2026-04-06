"use client";

import { useAuthNav } from "@/lib/auth-nav";
import { useApi } from "@/lib/typed-api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { LoginInput } from "@site-haus/validation/forms/auth";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { LoginForm } from "./form/login-form";

/**
 * Navigate to api.localhost/auth/sso-link via a form POST so the browser
 * treats api.localhost as the top-level site. This ensures the sh_refresh
 * cookie is stored in the unpartitioned first-party jar rather than the
 * iam.localhost-partitioned jar that Firefox's Total Cookie Protection would
 * produce for a cross-site fetch response.
 */
function navigateViaSSOLink(apiUrl: string, accessToken: string, oauthParams: string) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = `${apiUrl}/auth/sso-link`;
  form.style.display = "none";

  const addField = (name: string, value: string) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  };

  addField("accessToken", accessToken);
  addField("oauthParams", oauthParams);

  document.body.appendChild(form);
  form.submit();
}

export default function LoginContainer() {
  const { replace } = useAuthNav();

  const api = useApi();
  const searchParams = useSearchParams();

  const next = searchParams.get("next") || "/";
  const clientName = searchParams.get("client") || "";
  const oauthParams = searchParams.get("oauth_params");

  const setAccess = useAuthStore((s) => s.setAccess);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const user = useAuthStore((s) => s.user);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);

  // SSO shortcut: if already authenticated and this is an OAuth flow, skip
  // the login form. Use a form POST to /auth/sso-link so the sh_refresh cookie
  // is set in the first-party api.localhost context (Firefox Total Cookie
  // Protection partitions cookies from cross-site fetches, so a direct
  // window.location.href would arrive at /auth/authorize with no cookie).
  useEffect(() => {
    if (!bootstrapped || !user || !oauthParams) return;
    try {
      const currentToken = useAuthStore.getState().accessToken;
      if (!currentToken) return;
      clearAuth();
      navigateViaSSOLink(process.env.NEXT_PUBLIC_API_URL!, currentToken, oauthParams);
    } catch {
      // Malformed oauth_params — fall through to login form
    }
  }, [bootstrapped, user, oauthParams]);

  const onSubmit = async (values: LoginInput) => {
    const r = await api.auth.loginOnly.login({ body: values });

    if (r.status !== 200) throw r;

    const { accessToken, accessTokenExpiresIn, requiresEmailVerification, requires2FA } = r.body;

    if (requiresEmailVerification) {
      replace("/verify", { add: { email: values.email, mode: "email" } });
      return;
    }

    // If 2FA is required, store partial token and redirect to 2FA verification
    if (requires2FA) {
      const exp = Math.floor(Date.now() / 1000) + accessTokenExpiresIn;
      setAccess({ accessToken, accessExpiration: exp });
      replace("/2fa-verify");
      return;
    }

    const exp = Math.floor(Date.now() / 1000) + accessTokenExpiresIn;
    setAccess({ accessToken, accessExpiration: exp });

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
        navigateViaSSOLink(process.env.NEXT_PUBLIC_API_URL!, accessToken, oauthParams);
        return;
      } catch {
        // Fall through to normal redirect
      }
    }

    replace(next || "/");
  };

  return <LoginForm onSubmit={onSubmit} authForLabel={clientName} />;
}
