"use client";

import { useAuthNav } from "@/lib/auth-nav";
import { useApi } from "@/lib/typed-api";
import { RequestInput } from "@site-haus/validation/forms/password";
import { useSearchParams } from "next/navigation";
import { RequestPasswordResetForm } from "./form/request-password-reset-form";

export default function RequestPasswordResetContainer() {
  const { replace } = useAuthNav();

  const api = useApi();
  const searchParams = useSearchParams();

  const clientName = searchParams.get("client") || "";

  const onSubmit = async (values: RequestInput) => {
    const r = await api.password.requestReset({ body: values });
    if (r.status !== 204) throw r;

    replace("/verify", { add: { email: values.email, mode: "reset" } });
  };

  return <RequestPasswordResetForm onSubmit={onSubmit} authForLabel={clientName} />;
}
