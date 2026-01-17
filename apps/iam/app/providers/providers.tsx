"use client";

import { initStoresSdk } from "@site-haus/stores/api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { ThemeProvider } from "@site-haus/ui/components/base/theme-provider";
import { ReactNode, useEffect } from "react";

interface ProvidersProps {
  children: ReactNode;
}

const API = process.env.NEXT_PUBLIC_API_URL!;
const CLIENT = process.env.NEXT_PUBLIC_CLIENT_KEY!;

if (!API || !CLIENT) {
  throw new Error("Env missing: set API_URL and CLIENT_KEY");
}

initStoresSdk({
  baseURL: process.env.NEXT_PUBLIC_API_URL!,
  clientKey: process.env.NEXT_PUBLIC_CLIENT_KEY!,
  proactiveRefreshSkewSec: 60,
  targetClientIdProvider: () => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      // Use "manage" param for client switching (not "client" which is used for OAuth)
      return searchParams.get("manage");
    } catch {
      return null;
    }
  },
});

const Providers = ({ children }: ProvidersProps) => {
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (hydrated) {
      void useAuthStore.getState().bootstrap();
    }
  }, [hydrated]);

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
