"use client";

import { initStoresSdk } from "@site-haus/stores/api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { ReactNode, useEffect } from "react";

interface ProvidersProps {
  children: ReactNode;
}

const Providers = ({ children }: ProvidersProps) => {
  useEffect(() => {
    initStoresSdk({
      baseURL: process.env.NEXT_PUBLIC_API_URL!,
      clientKey: process.env.NEXT_PUBLIC_CLIENT_KEY!,
      proactiveRefreshSkewSec: 60,
    });

    void useAuthStore.getState().bootstrap();
  }, []);

  return <>{children}</>;
};

export default Providers;
