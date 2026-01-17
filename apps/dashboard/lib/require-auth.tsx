"use client";

import { useAuthStore } from "@site-haus/stores/auth-store";
import { useRouter } from "next/navigation";
import { ReactElement, useEffect } from "react";

interface RequireAuthProps {
  children: ReactElement;
}

export const RequireAuth = ({ children }: RequireAuthProps) => {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);

  useEffect(() => {
    if (!bootstrapped) return;

    if (!accessToken) {
      router.replace("/login");
    }
  }, [accessToken, router, bootstrapped]);

  if (!bootstrapped) return null;

  if (!accessToken) return null;

  return <>{children}</>;
};
