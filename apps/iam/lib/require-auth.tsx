import { useAuthStore } from "@site-haus/stores/auth-store";
import { ReactElement, useEffect } from "react";
import { useAuthNav } from "./auth-nav";

interface RequireAuthProps {
  children: ReactElement;
}

export const RequireAuth = ({ children }: RequireAuthProps) => {
  const { replace, params } = useAuthNav();
  const accessToken = useAuthStore((s) => s.accessToken);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!bootstrapped) return;

    // Not logged in - redirect to login
    if (!accessToken) {
      const computedNext =
        window.location.pathname +
        window.location.search +
        window.location.hash;

      const next = params.next ?? computedNext;

      replace(`/login`, {
        preserve: ["client", "email", "mode"],
        strip: ["next"],
        add: { next },
      });
      return;
    }

    // Logged in but not verified - redirect to verify
    if (user && !user.isVerified) {
      // Use existing next param or just the pathname (avoid including verify-related query params)
      const computedNext = params.next || window.location.pathname;

      replace(`/verify`, {
        preserve: ["client"],
        add: {
          email: user.email,
          mode: "email",
          next: computedNext,
          // Default to "Site Haus" if no client is present (direct IAM access)
          ...(params.client ? {} : { client: "Site Haus" }),
        },
      });
      return;
    }
  }, [accessToken, replace, bootstrapped, params.next, user]);

  if (!bootstrapped) return null;

  if (!accessToken) return null;

  if (user && !user.isVerified) return null;

  return <>{children}</>;
};
