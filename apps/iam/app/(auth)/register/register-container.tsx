"use client";

import { useAuthNav } from "@/lib/auth-nav";
import { useApi } from "@/lib/typed-api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { RegisterInput } from "@site-haus/validation/forms/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { RegisterForm } from "./form/register-form";

export default function RegisterContainer() {
  const { replace } = useAuthNav();
  const api = useApi();
  const router = useRouter();
  const searchParams = useSearchParams();

  const next = searchParams.get("next") || "/";
  const clientName = searchParams.get("client") || "";
  const oauthParams = searchParams.get("oauth_params");

  const setAccess = useAuthStore((s) => s.setAccess);

  const onSubmit = async (values: RegisterInput) => {
    const r = await api.auth.public.register({ body: values });
    if (r.status !== 200) throw r;

    const { accessToken, accessTokenExpiresIn, requiresEmailVerification } =
      r.body;

    if (requiresEmailVerification) {
      // Preserve OAuth params through email verification flow
      replace(`/verify`, {
        add: {
          email: values.email,
          mode: "email",
          ...(oauthParams ? { oauth_params: oauthParams } : {}),
          ...(clientName ? { client: clientName } : {}),
        },
      });
      return;
    }

    const exp = Math.floor(Date.now() / 1000) + accessTokenExpiresIn;
    setAccess({ accessToken, accessExpiration: exp });

    // Hydrate user/session/permissions
    await useAuthStore.getState().me();

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
        window.location.href = authorizeUrl.toString();
        return;
      } catch (err) {
        console.error("Failed to parse oauth_params:", err);
        // Fall through to normal redirect
      }
    }

    router.replace(next || "/");
  };

  return <RegisterForm onSubmit={onSubmit} authForLabel={clientName} />;
}
