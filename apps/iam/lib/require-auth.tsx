import { useAuthStore } from "@site-haus/stores/auth-store";
import { useRouter } from "next/navigation";
import { ReactElement, useEffect } from "react";

interface RequireAuthProps {
  children: ReactElement;
}

export const RequireAuth = ({ children }: RequireAuthProps) => {
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
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [accessToken, router]);

  if (!accessToken) return null;
  return <>{children}</>;
};
