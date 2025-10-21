import { useApi } from "@/lib/typed-api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { RegisterForm } from "@site-haus/ui/components/forms/register-form";
import { RegisterInput } from "@site-haus/validation/forms/auth";
import { useRouter, useSearchParams } from "next/navigation";

export default function RegisterContainer() {
  const api = useApi();
  const router = useRouter();
  const next = useSearchParams().get("next") || "/";
  const setAccess = useAuthStore((s) => s.setAccess);

  const onSubmit = async (values: RegisterInput) => {
    const r = await api.auth.public.register({ body: values });
    if (r.status !== 200) throw new Error("Registration failed");

    const { accessToken, accessTokenExpiresIn, requiresEmailVerification } =
      r.body;

    if (requiresEmailVerification) {
      router.replace("/verify?email=" + encodeURIComponent(values.email));
      return;
    }

    const exp = Math.floor(Date.now() / 1000) + accessTokenExpiresIn;
    setAccess({ accessToken, accessExpiration: exp });
    router.replace(next);
  };

  return <RegisterForm onSubmit={onSubmit} />;
}
