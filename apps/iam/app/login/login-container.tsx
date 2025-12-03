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

  const setAccess = useAuthStore((s) => s.setAccess);

  const onSubmit = async (values: LoginInput) => {
    const r = await api.auth.loginOnly.login({ body: values });

    if (r.status !== 200) throw r;

    const { accessToken, accessTokenExpiresIn, requiresEmailVerification } =
      r.body;

    console.log(requiresEmailVerification);

    if (requiresEmailVerification) {
      replace("/verify", { add: { email: values.email, mode: "email" } });
      return;
    }

    const exp = Math.floor(Date.now() / 1000) + accessTokenExpiresIn;
    setAccess({ accessToken, accessExpiration: exp });

    // Hydrate user/session/permissions
    await useAuthStore.getState().me();

    router.replace(next || "/");
  };

  return <LoginForm onSubmit={onSubmit} authForLabel={clientName} />;
}
