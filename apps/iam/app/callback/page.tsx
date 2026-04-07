"use client";

import { exchangeCodeForTokens } from "@site-haus/sdk";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const setAccess = useAuthStore((s) => s.setAccess);

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get("code");
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (error) {
        setError(errorDescription || error);
        toast.error(`Authentication failed: ${errorDescription || error}`);
        return;
      }

      if (!code) {
        setError("No authorization code received");
        return;
      }

      const returnedState = searchParams.get("state");
      const storedState = sessionStorage.getItem("oauth_state");
      if (!returnedState || returnedState !== storedState) {
        setError("State mismatch — possible CSRF attack");
        return;
      }

      try {
        const codeVerifier = sessionStorage.getItem("oauth_code_verifier");
        if (!codeVerifier) {
          throw new Error("Code verifier not found");
        }

        const tokens = await exchangeCodeForTokens({
          tokenUrl: `${process.env.NEXT_PUBLIC_API_URL}/auth/token`,
          code,
          codeVerifier,
          clientKey: process.env.NEXT_PUBLIC_CLIENT_KEY!,
          redirectUri: `${window.location.origin}/callback`,
        });

        const exp = Math.floor(Date.now() / 1000) + tokens.expires_in;

        setAccess({
          accessToken: tokens.access_token,
          accessExpiration: exp,
        });

        await useAuthStore.getState().me();
        await useAuthStore.getState().loadMyClients();

        const nextUrl = sessionStorage.getItem("oauth_next") || "/";
        sessionStorage.removeItem("oauth_code_verifier");
        sessionStorage.removeItem("oauth_state");
        sessionStorage.removeItem("oauth_next");

        router.replace(nextUrl);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to exchange code for tokens";
        setError(message);
        toast.error(message);
      }
    }

    handleCallback();
  }, [searchParams, router, setAccess]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 max-w-md">
          <h1 className="text-2xl font-semibold mb-4 text-red-600">Authentication Failed</h1>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center justify-center">
        <Spinner className="size-6 text-primary" />
        <p className="mt-4 text-gray-600">Completing Your Authentication Request</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="flex flex-col items-center justify-center">
              <Spinner className="size-6 text-primary" />
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
