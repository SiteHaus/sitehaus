"use client";

import { useAuthNav } from "@/lib/auth-nav";
import { useApi } from "@/lib/typed-api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { LoginInput } from "@site-haus/validation/forms/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginForm } from "./form/login-form";

export default function LoginContainer() {
  const { replace } = useAuthNav();

  const api = useApi();
  const router = useRouter();
  const searchParams = useSearchParams();

  const next = searchParams.get("next") || "/";
  const clientName = searchParams.get("client") || "";
  const oauthParams = searchParams.get("oauth_params");

  const setAccess = useAuthStore((s) => s.setAccess);

  const onSubmit = async (values: LoginInput) => {
    const r = await api.auth.loginOnly.login({ body: values });

    if (r.status !== 200) throw r;

    const {
      accessToken,
      accessTokenExpiresIn,
      requiresEmailVerification,
      requires2FA,
    } = r.body;

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

  return <LoginForm onSubmit={onSubmit} authForLabel={clientName} />;
}
