import { generatePKCE } from "@site-haus/sdk/oauth";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { ReactElement, useEffect, useRef } from "react";
import { useAuthNav } from "./auth-nav";

interface RequireAuthProps {
  children: ReactElement;
}

export const RequireAuth = ({ children }: RequireAuthProps) => {
  const { replace, params } = useAuthNav();
  const accessToken = useAuthStore((s) => s.accessToken);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const user = useAuthStore((s) => s.user);
  const startingOAuth = useRef(false);

  useEffect(() => {
    if (!bootstrapped) return;

    // Not logged in - start OAuth flow
    if (!accessToken) {
      // Prevent double-triggering
      if (startingOAuth.current) return;
      startingOAuth.current = true;

      const computedNext =
        window.location.pathname +
        window.location.search +
        window.location.hash;

      const next = params.next ?? computedNext;

      // Store next URL for callback to use
      sessionStorage.setItem("oauth_next", next);

      // Start OAuth flow
      (async () => {
        const { codeVerifier, codeChallenge } = await generatePKCE();
        const state = Math.random().toString(36).substring(7);

        sessionStorage.setItem("oauth_code_verifier", codeVerifier);
        sessionStorage.setItem("oauth_state", state);

        const authParams = new URLSearchParams({
          client_key: process.env.NEXT_PUBLIC_CLIENT_KEY!,
          redirect_uri: `${window.location.origin}/callback`,
          response_type: "code",
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
          scope: "openid profile email",
          state,
        });

        window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/authorize?${authParams}`;
      })();
      return;
    }

    // Logged in but not verified - redirect to verify
    if (user && !user.isVerified) {
      const computedNext = params.next || window.location.pathname;

      replace(`/verify`, {
        preserve: ["client"],
        add: {
          email: user.email,
          mode: "email",
          next: computedNext,
          ...(params.client ? {} : { client: "Site Haus" }),
        },
      });
      return;
    }
  }, [accessToken, replace, bootstrapped, params.next, user, params.client]);

  if (!bootstrapped) return null;

  if (!accessToken) return null;

  if (user && !user.isVerified) return null;

  return <>{children}</>;
};
