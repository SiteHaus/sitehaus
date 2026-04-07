"use client";

import { useParams, useRouter } from "next/navigation";

export function useStoreNav() {
  const router = useRouter();
  const params = useParams<{ storeSlug?: string }>();
  const storeSlug = params?.storeSlug ?? "";

  return {
    push: (path: string) => router.push(`/${storeSlug}${path}`),
    replace: (path: string) => router.replace(`/${storeSlug}${path}`),
    storeSlug,
  };
}
