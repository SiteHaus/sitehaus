"use client";

import { useApi } from "@/lib/typed-api";
import { VerifyCodeForm } from "@site-haus/ui/components/forms/verify-form";
import {
  requestVerifySchema,
  VerifyInput,
} from "@site-haus/validation/forms/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function VerifyCodeContainer() {
  const api = useApi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const email = searchParams.get("email") || "";

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

  const onSubmit = async (values: VerifyInput) => {
    const r = await api.auth.public.verifyEmail({ body: values });
    if (r.status !== 204) throw r;

    router.replace(next);
  };

  const requestCode = async () => {
    setResending(true);
    const parsed = requestVerifySchema.parse({ email });
    const r = await api.auth.public.requestEmailVerification({
      body: parsed,
    });

    if (r.status !== 204) throw new Error("Resend Failed.");
    setCooldown(30);

    setResending(false);
  };

  return (
    <VerifyCodeForm
      onSubmit={onSubmit}
      next={next}
      defaultValues={{ email }}
      requestCode={requestCode}
      resending={resending}
      cooldown={cooldown}
    />
  );
}
