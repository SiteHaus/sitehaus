"use client";

import { getAccessibleStores, type AccessibleStore } from "@/lib/commerce";
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

    const { accessToken, clients, loadMyClients } = useAuthStore.getState();

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
          setError("Your store is being set up.");
          return;
        }

        if (fetchedStores.length === 1) {
          const store = fetchedStores[0]!;
          useAuthStore.getState().setManagedClientId(store.clientId);
          router.replace(`/${store.slug}`);
          return;
        }

        setStores(fetchedStores);
      } catch {
        setError("Failed to resolve store. Please try again.");
      }
    }

    resolve();
  }, [bootstrapped, router]);

  function handleSelectStore(store: AccessibleStore) {
    useAuthStore.getState().setManagedClientId(store.clientId);
    router.replace(`/${store.slug}`);
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-1 text-center px-4">
        <p className="text-muted-foreground">{error}</p>
        {error.includes("access to any stores") && (
          <p className="text-sm text-muted-foreground">
            Contact{" "}
            <a
              href="mailto:support@sitehaus.com"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              SiteHaus
            </a>{" "}
            to get started.
          </p>
        )}
        {error.includes("store is being set up") && (
          <p className="text-sm text-muted-foreground">
            Reach out to your{" "}
            <a
              href="mailto:support@sitehaus.com"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              SiteHaus
            </a>{" "}
            contact if you have questions.
          </p>
        )}
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
