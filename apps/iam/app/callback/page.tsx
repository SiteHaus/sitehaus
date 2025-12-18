"use client";

import { exchangeCodeForTokens } from "@site-haus/sdk/oauth";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Suspense } from "react";

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

      try {
        // Get stored code verifier
        const codeVerifier = sessionStorage.getItem("oauth_code_verifier");
        if (!codeVerifier) {
          throw new Error("Code verifier not found");
        }

        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens({
          tokenUrl: `${process.env.NEXT_PUBLIC_API_URL}/auth/token`,
          code,
          codeVerifier,
          clientKey: process.env.NEXT_PUBLIC_CLIENT_KEY!,
          redirectUri: `${window.location.origin}/callback`,
        });

        // Calculate expiration
        const exp = Math.floor(Date.now() / 1000) + tokens.expires_in;

        // Store access token
        console.log("=== OAuth Callback Debug ===");
        console.log("Tokens received:", tokens);
        setAccess({
          accessToken: tokens.access_token,
          accessExpiration: exp,
        });
        console.log("Access token stored");

        // Hydrate user/session/permissions
        await useAuthStore.getState().me();
        const user = useAuthStore.getState().user;
        console.log("User after me():", user);

        // Clean up
        sessionStorage.removeItem("oauth_code_verifier");

        // Wait a bit for Zustand persist middleware to save to localStorage
        // This ensures the user data is persisted before navigating
        await new Promise(resolve => setTimeout(resolve, 100));

        // Redirect to dashboard
        console.log("Redirecting to /");
        router.replace("/");
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to exchange code for tokens";
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
          <h1 className="text-2xl font-semibold mb-4 text-red-600">
            Authentication Failed
          </h1>
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
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
