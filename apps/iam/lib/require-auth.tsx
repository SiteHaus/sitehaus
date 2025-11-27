import { useAuthStore } from "@site-haus/stores/auth-store";
import { useRouter } from "next/navigation";
import { ReactElement, useEffect } from "react";
import { useAuthNav } from "./auth-nav";

interface RequireAuthProps {
  children: ReactElement;
}

export const RequireAuth = ({ children }: RequireAuthProps) => {
  const { replace } = useAuthNav();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) {
      const next =
        typeof window !== "undefined"
          ? window.location.pathname +
            window.location.search +
            window.location.hash
          : "/";
      replace(`/login`);
    }
  }, [accessToken, router]);

  if (!accessToken) return null;
  return <>{children}</>;
};
