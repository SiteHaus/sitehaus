"use client";

import { generatePKCE } from "@site-haus/sdk/oauth";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { Button } from "@site-haus/ui/components/base/button";
import { Shield } from "lucide-react";
import { TopNav } from "./components/navigation/top-nav";

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);

  console.log("=== HomePage Debug ===");
  console.log("Hydrated:", hydrated);
  console.log("User:", user);

  // Handle OAuth login
  const handleLogin = async () => {
    const { codeVerifier, codeChallenge } = await generatePKCE();
    const state = Math.random().toString(36).substring(7);

    sessionStorage.setItem("oauth_code_verifier", codeVerifier);
    sessionStorage.setItem("oauth_state", state);

    const params = new URLSearchParams({
      client_key: process.env.NEXT_PUBLIC_CLIENT_KEY!,
      redirect_uri: `${window.location.origin}/callback`,
      response_type: "code",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      scope: "openid profile email",
      state,
    });

    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/authorize?${params}`;
  };

  // Loading state while auth store hydrates
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated landing page
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6" />
              <h1 className="text-xl font-bold">SiteHaus Identity</h1>
            </div>
            <Button onClick={handleLogin}>Log In</Button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-2xl px-4">
            <h2 className="text-4xl font-bold mb-4">
              Secure Identity Management
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Authentication and access control for SiteHaus clients
            </p>
            <Button onClick={handleLogin} size="lg">
              Access Your Account
            </Button>
          </div>
        </main>

        <footer className="border-t py-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} SiteHaus. All rights reserved.
        </footer>
      </div>
    );
  }

  // Authenticated view
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">
          Welcome back, {user.firstName}!
        </h1>
        <p className="text-muted-foreground mb-8">
          Manage your identity and access settings
        </p>
        {/* TODO: Add quick links or dashboard content */}
      </main>
    </div>
  );
}
