"use client";

import { updateSDKClientKey } from "@site-haus/sdk";
import { initStoresSdk } from "@site-haus/stores/api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { ThemeProvider } from "@site-haus/ui/components/base/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
  targetClientIdProvider: () => null,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const Providers = ({ children }: ProvidersProps) => {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/callback") return;
    const storedClientKey = localStorage.getItem("commerce_client_key");
    if (storedClientKey) {
      updateSDKClientKey(storedClientKey);
    }
    void useAuthStore.getState().bootstrap();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default Providers;
