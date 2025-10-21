"use client";

import { useAuthStore } from "@site-haus/stores/auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function withAuth<P>(Comp: React.ComponentType<P>) {
  return function Guarded(props: P) {
    const router = useRouter();
    const accessToken = useAuthStore((s) => s.accessToken);

    useEffect(() => {
      if (!accessToken)
        router.replace(
          `/login?next=${encodeURIComponent(window.location.pathname)}`
        );
    }, [accessToken, router]);

    if (!accessToken) return null; // TODO: Maybe replace this with a skeleton
    return <Comp {...props} />;
  };
}
