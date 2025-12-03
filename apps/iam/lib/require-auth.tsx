import { useAuthStore } from "@site-haus/stores/auth-store";
import { ReactElement, useEffect } from "react";
import { useAuthNav } from "./auth-nav";

interface RequireAuthProps {
  children: ReactElement;
}

export const RequireAuth = ({ children }: RequireAuthProps) => {
  const { replace } = useAuthNav();
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

      // TODO: Use next in the redirect, or take another look at this method.
      console.log(next);
    }
  }, [accessToken, replace]);

  if (!accessToken) return null;
  return <>{children}</>;
};
