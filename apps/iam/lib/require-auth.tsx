import { useAuthStore } from "@site-haus/stores/auth-store";
import { ReactElement, useEffect } from "react";
import { useAuthNav } from "./auth-nav";

interface RequireAuthProps {
  children: ReactElement;
}

export const RequireAuth = ({ children }: RequireAuthProps) => {
  const { replace, params } = useAuthNav();
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;

    if (accessToken) return;

    const computedNext =
      window.location.pathname + window.location.search + window.location.hash;

    const next = params.next ?? computedNext;

    replace(`/login`, {
      preserve: ["client", "email", "mode"],
      strip: ["next"],
      add: { next },
    });
  }, [accessToken, replace, hydrated, params.next]);

  if (!hydrated) return null;

  if (!accessToken) return null;

  return <>{children}</>;
};
