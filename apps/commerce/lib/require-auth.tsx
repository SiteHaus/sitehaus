"use client";

import { generatePKCE } from "@site-haus/sdk/oauth";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { useRouter } from "next/navigation";
import { ReactElement, useEffect } from "react";

interface RequireAuthProps {
  children: ReactElement;
}

export const RequireAuth = ({ children }: RequireAuthProps) => {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    if (!bootstrapped) return;

    if (!accessToken) {
      router.replace("/login");
      return;
    }

    if (user && !user.isVerified) {
      void (async () => {
        const { codeVerifier, codeChallenge } = await generatePKCE();
        const state = Math.random().toString(36).substring(7);

        sessionStorage.setItem("oauth_code_verifier", codeVerifier);
        sessionStorage.setItem("oauth_state", state);

        const oauthParams = btoa(
          JSON.stringify({
            client_key: process.env.NEXT_PUBLIC_CLIENT_KEY,
            redirect_uri: `${window.location.origin}/callback`,
            response_type: "code",
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
            scope: "openid profile email",
            state,
          })
        )
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=/g, "");

        clearAuth();

        const verifyUrl = new URL(
          `${process.env.NEXT_PUBLIC_IAM_URL}/verify`
        );
        verifyUrl.searchParams.set("email", user.email);
        verifyUrl.searchParams.set("mode", "email");
        verifyUrl.searchParams.set("oauth_params", oauthParams);

        window.location.href = verifyUrl.toString();
      })();
    }
  }, [accessToken, user, router, bootstrapped, clearAuth]);

  if (!bootstrapped) return null;
  if (!accessToken) return null;
  if (user && !user.isVerified) return null;

  return <>{children}</>;
};
