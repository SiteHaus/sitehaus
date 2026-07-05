"use client";

import { getMyStore } from "@/lib/commerce";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * Money formatter bound to the store's configured currency (falls back to USD
 * until the cached `["store"]` query resolves). Use this instead of hardcoding
 * "USD" in admin views — stores bill in their own currency.
 */
export function useFormatCents() {
  const { data: store } = useQuery({ queryKey: ["store"], queryFn: getMyStore });
  const currency = (store?.currency ?? "usd").toUpperCase();

  return useCallback(
    (cents: number, opts?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency, ...opts }).format(cents / 100),
    [currency],
  );
}
