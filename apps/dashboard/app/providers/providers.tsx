"use client";

import { initStoresSdk } from "@site-haus/stores/api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { ThemeProvider } from "@site-haus/ui/components/base/theme-provider";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect } from "react";

interface ProvidersProps {
  children: ReactNode;
}

const API = process.env.NEXT_PUBLIC_API_URL!;
const CLIENT = process.env.NEXT_PUBLIC_CLIENT_KEY!;

if (!API || !CLIENT) {
  throw new Error("Env missing: set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_CLIENT_KEY");
}

initStoresSdk({
  baseURL: API,
  clientKey: CLIENT,
  proactiveRefreshSkewSec: 60,
  targetClientIdProvider: () => useAuthStore.getState().managedClientId ?? null,
});

const Providers = ({ children }: ProvidersProps) => {
  const hydrated = useAuthStore((s) => s.hydrated);
  const pathname = usePathname();

  useEffect(() => {
    // Skip bootstrap on callback page - it handles its own token exchange
    // Running bootstrap here would race with the OAuth flow and cause session conflicts
    if (hydrated && pathname !== "/callback") {
      void useAuthStore.getState().bootstrap();
    }
  }, [hydrated, pathname]);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
};

export default Providers;
