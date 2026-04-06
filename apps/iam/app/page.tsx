"use client";

import { generatePKCE, generateState } from "@site-haus/sdk/oauth";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@site-haus/ui/components/base/card";
import { Fingerprint, GlobeLock, IdCard, MoveRight, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SiteNav } from "./components/navigation/site-nav";

export default function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const router = useRouter();

  // Redirect logged-in users to the console
  useEffect(() => {
    if (bootstrapped && user) {
      router.replace("/my-sessions");
    }
  }, [bootstrapped, user, router]);

  const handleLogin = async () => {
    const { codeVerifier, codeChallenge } = await generatePKCE();
    const state = generateState();

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

  // Loading state while bootstrap runs or redirecting
  if (!bootstrapped || user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteNav />

      <main className="flex-1 container mx-auto mt-6">
        <div className="text-center h-[40vh] flex flex-col justify-center items-center">
          <div>
            <div className="flex items-center justify-start gap-4">
              <div className="p-2 bg-card/70 border rounded-2xl flex items-center justify-center">
                <IdCard className="h-10 w-10" />
              </div>
              <h2 className="text-4xl font-bold">SiteHaus Identity Management</h2>
            </div>
            <p className="text-lg text-muted-foreground mb-8">
              Authentication and access control for SiteHaus clients
            </p>
          </div>
          <Button onClick={handleLogin} size="lg">
            Access Your Account <MoveRight />
          </Button>
        </div>
        <div className="container mx-auto flex items-center justify-center gap-2">
          <Card className="flex-1 shadow-none">
            <CardHeader>
              <CardTitle className="text-xl">Secure Access</CardTitle>
            </CardHeader>
            <CardFooter className="flex items-center justify-between">
              <CardDescription>Control who has access to your apps.</CardDescription>
              <div className="p-2 bg-background/70 border rounded-2xl flex items-center justify-center">
                <GlobeLock className="h-10 w-10" />
              </div>
            </CardFooter>
          </Card>
          <Card className="flex-1 shadow-none">
            <CardHeader>
              <CardTitle className="text-xl">Team Management</CardTitle>
            </CardHeader>
            <CardFooter className="flex items-center justify-between">
              <CardDescription>Invite and organize your team.</CardDescription>
              <div className="p-2 bg-background/70 border rounded-2xl flex items-center justify-center">
                <UsersRound className="h-10 w-10" />
              </div>
            </CardFooter>
          </Card>
          <Card className="flex-1 shadow-none">
            <CardHeader>
              <CardTitle className="text-xl">Single Sign-On</CardTitle>
            </CardHeader>
            <CardFooter className="flex items-center justify-between">
              <CardDescription>One identity, all your apps!</CardDescription>
              <div className="p-2 bg-background/70 border rounded-2xl flex items-center justify-center">
                <Fingerprint className="h-10 w-10" />
              </div>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
