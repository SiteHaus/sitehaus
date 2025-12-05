"use client";

import { VerifyCodeForm } from "@/app/verify/form/verify-form";
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

export default function VerifyCodeContainer() {
  const { replace } = useAuthNav();
  const api = useApi();
  const searchParams = useSearchParams();

  const next = searchParams.get("next") || "/";
  const email = searchParams.get("email") || "";
  const mode = searchParams.get("mode") as VerificationMode;

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
      replace("/verify", { add: { email, mode: "email" } });
      return;
    }

    const exp = Math.floor(Date.now() / 1000) + accessTokenExpiresIn;
    setAccess({ accessToken, accessExpiration: exp });

    await useAuthStore.getState().me();

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
    />
  );
}
