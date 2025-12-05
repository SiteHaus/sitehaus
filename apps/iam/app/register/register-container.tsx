"use client";

import { useAuthNav } from "@/lib/auth-nav";
import { useApi } from "@/lib/typed-api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { RegisterInput } from "@site-haus/validation/forms/auth";
import { useSearchParams } from "next/navigation";
import { RegisterForm } from "./form/register-form";

export default function RegisterContainer() {
  const { replace } = useAuthNav();
  const api = useApi();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const setAccess = useAuthStore((s) => s.setAccess);

  const onSubmit = async (values: RegisterInput) => {
    const r = await api.auth.public.register({ body: values });
    if (r.status !== 200) throw r;

    const { accessToken, accessTokenExpiresIn, requiresEmailVerification } =
      r.body;

    if (requiresEmailVerification) {
      replace(`/verify`, { add: { email: values.email, mode: "email" } });
      return;
    }

    const exp = Math.floor(Date.now() / 1000) + accessTokenExpiresIn;
    setAccess({ accessToken, accessExpiration: exp });
    replace(next);
  };

  return <RegisterForm onSubmit={onSubmit} />;
}
