"use client";

import { useApi } from "@/lib/typed-api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { LoginForm } from "@site-haus/ui/components/forms/login-form";
import { LoginInput } from "@site-haus/validation/forms/auth";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginContainer() {
  const api = useApi();
  const router = useRouter();
  const searchParams = useSearchParams();

  const next = searchParams.get("next") || "/";
  const clientName = searchParams.get("client") || "";

  const setAccess = useAuthStore((s) => s.setAccess);

  const onSubmit = async (values: LoginInput) => {
    const r = await api.auth.loginOnly.login({ body: values });

    if (r.status !== 200) throw r;

    const { accessToken, accessTokenExpiresIn, requiresEmailVerification } =
      r.body;

    if (requiresEmailVerification) {
      router.replace(
        `/verify?email=${encodeURIComponent(values.email)}&next=${encodeURIComponent(next)}`
      );
      return;
    }

    const exp = Math.floor(Date.now() / 1000) + accessTokenExpiresIn;
    setAccess({ accessToken, accessExpiration: exp });

    // Hydrate user/session/permissions
    await useAuthStore.getState().me();

    router.replace(next);
  };

  return <LoginForm onSubmit={onSubmit} authForLabel={clientName} />;
}
