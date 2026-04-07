"use client";

import { getAccessibleStores, type AccessibleStore } from "@/lib/commerce";
import { generatePKCE, generateState } from "@site-haus/sdk/oauth";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function StoreResolverPage() {
  const router = useRouter();
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const [stores, setStores] = useState<AccessibleStore[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bootstrapped) return;

    const { accessToken, session, clients, loadMyClients } = useAuthStore.getState();

    if (!accessToken) {
      router.replace("/login");
      return;
    }

    async function resolve() {
      try {
        let resolvedClients = clients;
        if (resolvedClients.length === 0) {
          await loadMyClients();
          resolvedClients = useAuthStore.getState().clients;
        }

        const merchantClients = resolvedClients.filter((c) => !c.firstParty && !c.hidden);
        if (merchantClients.length === 0) {
          setError("You don't have access to any stores.");
          return;
        }

        const clientIds = merchantClients.map((c) => c.id).join(",");
        const { stores: fetchedStores } = await getAccessibleStores(clientIds);

        if (fetchedStores.length === 0) {
          setError("No stores found for your account.");
          return;
        }

        if (fetchedStores.length === 1) {
          const store = fetchedStores[0]!;
          if (session?.clientId === store.clientId) {
            router.replace(`/${store.slug}`);
          } else {
            const client = resolvedClients.find((c) => c.id === store.clientId);
            if (!client) {
              setError("Unable to authenticate with store.");
              return;
            }
            await reAuth(client.key);
          }
          return;
        }

        setStores(fetchedStores);
      } catch {
        setError("Failed to resolve store. Please try again.");
      }
    }

    resolve();
  }, [bootstrapped, router]);

  async function reAuth(clientKey: string) {
    const { codeVerifier, codeChallenge } = await generatePKCE();
    const state = generateState();
    sessionStorage.setItem("oauth_code_verifier", codeVerifier);
    sessionStorage.setItem("oauth_state", state);
    sessionStorage.setItem("oauth_client_key", clientKey);

    const params = new URLSearchParams({
      client_key: clientKey,
      redirect_uri: `${window.location.origin}/callback`,
      response_type: "code",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      scope: "openid profile email",
      state,
    });
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/authorize?${params}`;
  }

  async function handleSelectStore(store: AccessibleStore) {
    const { session, clients } = useAuthStore.getState();
    if (session?.clientId === store.clientId) {
      router.replace(`/${store.slug}`);
      return;
    }
    const client = clients.find((c) => c.id === store.clientId);
    if (!client) return;
    await reAuth(client.key);
  }

  if (!stores && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-sm space-y-4 p-6">
        <h1 className="text-2xl font-bold text-center">Select a Store</h1>
        <div className="space-y-2">
          {stores!.map((store) => (
            <button
              key={store.id}
              onClick={() => handleSelectStore(store)}
              className="w-full p-4 border rounded-lg bg-card hover:bg-accent text-left transition-colors"
            >
              <p className="font-medium">{store.name}</p>
              <p className="text-sm text-muted-foreground">{store.slug}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
