import { useAuthStore } from "@site-haus/stores/auth-store";

const COMMERCE_URL = process.env.NEXT_PUBLIC_COMMERCE_URL!;

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = useAuthStore.getState().accessToken;

  const res = await fetch(`${COMMERCE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const getMyStore = () => request<{ id: string; name: string; slug: string; currency: string; timezone: string; isActive: boolean }>("/v1/store/me");

// ─── Products ────────────────────────────────────────────────────────────────

export type ProductItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
};

export type ProductListResponse = {
  items: ProductItem[];
  total: number;
  page: number;
  limit: number;
};

export const listProducts = (params?: { page?: number; limit?: number; search?: string }) => {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.search) qs.set("search", params.search);
  return request<ProductListResponse>(`/v1/products?${qs}`);
};

// ─── Orders ──────────────────────────────────────────────────────────────────

export type OrderItem = {
  id: string;
  status: string;
  email: string;
  totalCents: number;
  currency: string;
  createdAt: string;
};

export type OrderListResponse = {
  items: OrderItem[];
  total: number;
  page: number;
  limit: number;
};

export const listOrders = (params?: { page?: number; limit?: number; status?: string }) => {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.status) qs.set("status", params.status);
  return request<OrderListResponse>(`/v1/orders?${qs}`);
};

// ─── Collections ─────────────────────────────────────────────────────────────

export type CollectionItem = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
};

export const listCollections = () =>
  request<{ items: CollectionItem[] }>("/v1/collections");
