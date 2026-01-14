"use client";

import { VerifyCodeForm } from "@/app/(auth)/verify/form/verify-form";
import { useAuthNav } from "@/lib/auth-nav";
import { useApi } from "@/lib/typed-api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import {
  requestVerifySchema,
  VerifyInput,
} from "@site-haus/validation/forms/auth";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type VerificationMode = "email" | "reset";

/**
 * Redirect to OAuth authorize endpoint if oauth_params is present
 */
function redirectToOAuth(oauthParams: string): boolean {
  try {
    const params = JSON.parse(
      atob(oauthParams.replace(/-/g, "+").replace(/_/g, "/"))
    );

    const authorizeUrl = new URL(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/authorize`
    );

    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        authorizeUrl.searchParams.set(key, value as string);
      }
    });

    window.location.href = authorizeUrl.toString();
    return true;
  } catch (err) {
    console.error("Failed to parse oauth_params:", err);
    return false;
  }
}

export default function VerifyCodeContainer() {
  const { replace } = useAuthNav();
  const api = useApi();
  const searchParams = useSearchParams();

  const next = searchParams.get("next") || "/";
  const email = searchParams.get("email") || "";
  const clientName = searchParams.get("client") || "";
  const mode = searchParams.get("mode") as VerificationMode;
  const oauthParams = searchParams.get("oauth_params");

  const setAccess = useAuthStore((s) => s.setAccess);

  const [resending, setResending] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldown]);

  const onSubmit = async ({ code }: VerifyInput) => {
    if (!email) {
      throw new Error("Missing email in URL, contact support.");
    }

    if (mode === "email") {
      const r = await api.auth.public.verifyEmail({ body: { email, code } });
      if (r.status !== 204) throw r;

      // Refresh user data so isVerified is updated
      await useAuthStore.getState().me();

      // Check if this is an OAuth flow
      if (oauthParams && redirectToOAuth(oauthParams)) {
        return;
      }

      replace(next || "/");
      return;
    }

    const r = await api.auth.loginOnly.loginWithCode({
      body: { email, code },
    });
    if (r.status !== 200) throw r;

    const { accessToken, accessTokenExpiresIn, requiresEmailVerification } =
      r.body;

    if (requiresEmailVerification) {
      replace("/verify", {
        add: {
          email,
          mode: "email",
          ...(oauthParams ? { oauth_params: oauthParams } : {}),
          ...(clientName ? { client: clientName } : {}),
        },
      });
      return;
    }

    const exp = Math.floor(Date.now() / 1000) + accessTokenExpiresIn;
    setAccess({ accessToken, accessExpiration: exp });

    await useAuthStore.getState().me();

    // Check if this is an OAuth flow
    if (oauthParams && redirectToOAuth(oauthParams)) {
      return;
    }

    replace(next || "/");
  };

  const requestCode = async () => {
    setResending(true);

    try {
      if (!email) throw new Error("Missing email in URL.");

      if (mode === "email") {
        const parsed = requestVerifySchema.parse({ email });
        const r = await api.auth.public.requestEmailVerification({
          body: parsed,
        });
        if (r.status !== 204) throw r;
      } else {
        const r = await api.password.requestReset({ body: { email } });
        if (r.status !== 204) throw r;
      }
      setCooldown(30);
    } finally {
      setResending(false);
    }
  };

  return (
    <VerifyCodeForm
      mode={mode}
      onSubmit={onSubmit}
      next={next}
      defaultValues={{ email }}
      requestCode={requestCode}
      resending={resending}
      cooldown={cooldown}
      authForLabel={clientName}
    />
  );
}
