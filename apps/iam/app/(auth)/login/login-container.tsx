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
    console.log("=== Login Submit Debug ===");
    console.log("oauth_params:", oauthParams);
    console.log("client:", clientName);

    const r = await api.auth.loginOnly.login({ body: values });

    if (r.status !== 200) throw r;

    const { accessToken, accessTokenExpiresIn, requiresEmailVerification } =
      r.body;

    if (requiresEmailVerification) {
      replace("/verify", { add: { email: values.email, mode: "email" } });
      return;
    }

    const exp = Math.floor(Date.now() / 1000) + accessTokenExpiresIn;
    setAccess({ accessToken, accessExpiration: exp });
    console.log("Access token set");

    // Hydrate user/session/permissions
    await useAuthStore.getState().me();
    console.log("User loaded:", useAuthStore.getState().user);

    // Check if this is an OAuth flow
    console.log("Checking oauth_params...");
    if (oauthParams) {
      console.log("OAuth flow detected, decoding params...");
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
        console.log("Redirecting to authorize URL:", authorizeUrl.toString());
        window.location.href = authorizeUrl.toString();
        return;
      } catch (err) {
        console.error("Failed to parse oauth_params:", err);
        // Fall through to normal redirect
      }
    }

    console.log("No oauth_params, redirecting to:", next || "/");
    router.replace(next || "/");
  };

  return <LoginForm onSubmit={onSubmit} authForLabel={clientName} />;
}
