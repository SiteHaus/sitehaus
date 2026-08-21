import { useAuthStore } from "@site-haus/stores/auth-store";

const COMMERCE_URL = process.env.NEXT_PUBLIC_COMMERCE_URL!;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { accessToken: token, managedClientId } = useAuthStore.getState();

  const res = await fetch(`${COMMERCE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(managedClientId ? { "x-client-id": managedClientId } : {}),
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

export type FulfillmentType = "shipping" | "pickup";

// Merchant-facing toggles for the notification emails they receive at
// `store.notificationEmail`. Keys mirror the backend's `notification_preferences`
// jsonb column (sitehaus-commerce packages/validation/src/store.schemas.ts) —
// keep in sync. `lowStock` has no sender wired up yet.
export type NotificationPreferences = {
  newOrder?: boolean;
  returnRequested?: boolean;
  lowStock?: boolean;
  paymentFailed?: boolean;
};

export type StoreDetail = {
  id: string;
  clientId: string;
  slug: string;
  domain: string | null;
  currency: string;
  stripeAccountId: string | null;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeDetailsSubmitted: boolean;
  reservationTtlMinutes: number;
  fulfillmentType: FulfillmentType;
  notificationPreferences: NotificationPreferences | null;
  taxRegistrationConfirmed: boolean;
};

export type StripeStatus = {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
};

export type AccessibleStore = { id: string; clientId: string; slug: string; name: string };

export const getAccessibleStores = (clientIds: string) =>
  request<{ stores: AccessibleStore[] }>(`/v1/admin/stores/accessible?clientIds=${clientIds}`);

export const getMyStore = () => request<StoreDetail>("/v1/admin/stores/me");

export const updateStore = (body: {
  name?: string;
  slug?: string;
  domain?: string | null;
  currency?: string;
  timezone?: string;
  reservationTtlMinutes?: number;
  fulfillmentType?: FulfillmentType;
  notificationPreferences?: NotificationPreferences;
  taxRegistrationConfirmed?: boolean;
}) =>
  request<StoreDetail>("/v1/admin/stores", {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const connectStripe = (returnUrl: string) =>
  request<{ url: string }>("/v1/admin/stores/connect-stripe", {
    method: "POST",
    body: JSON.stringify({ returnUrl }),
  });

export const getStripeStatus = () => request<StripeStatus>("/v1/admin/stores/stripe-status");

// ─── Products ────────────────────────────────────────────────────────────────

export type ProductStatus = "draft" | "active" | "archived";

export type ProductItem = {
  id: string;
  name: string;
  description: string | null;
  status: ProductStatus;
  goesLiveAt: string | null;
  variantCount: number;
  primaryImage: { cdnUrl: string; altText: string | null } | null;
  createdAt: string;
  updatedAt: string;
};

export type OptionValue = { id: string; value: string; sortOrder: number };
export type ProductOption = { id: string; name: string; sortOrder: number; values: OptionValue[] };
export type VariantOptionValueRef = {
  optionId: string;
  optionName: string;
  valueId: string;
  value: string;
};

export type VariantAdmin = {
  id: string;
  name: string;
  sku: string | null;
  priceCents: number;
  compareAtCents: number | null;
  isActive: boolean;
  sortOrder: number;
  stock: number;
  reserved: number;
  allowBackorder: boolean;
  availability: "in_stock" | "low_stock" | "out_of_stock";
  optionValues: VariantOptionValueRef[];
};

export type ProductDetail = ProductItem & {
  variants: VariantAdmin[];
  options: ProductOption[];
};

export type ProductListResponse = { items: ProductItem[]; total: number };

export const listProducts = (params?: {
  status?: ProductStatus;
  limit?: number;
  offset?: number;
}) => {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  return request<ProductListResponse>(`/v1/admin/products?${qs}`);
};

export const getProduct = (id: string) => request<ProductDetail>(`/v1/admin/products/${id}`);

export const createProduct = (body: {
  name: string;
  description?: string;
  status?: ProductStatus;
  goesLiveAt?: string | null;
}) =>
  request<ProductItem>("/v1/admin/products", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateProduct = (
  id: string,
  body: {
    name?: string;
    description?: string;
    status?: ProductStatus;
    goesLiveAt?: string | null;
  },
) =>
  request<ProductItem>(`/v1/admin/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const archiveProduct = (id: string) =>
  request<{ message: string }>(`/v1/admin/products/${id}`, {
    method: "DELETE",
  });

// ─── Variants ────────────────────────────────────────────────────────────────

export type VariantItem = {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  priceCents: number;
  compareAtCents: number | null;
  isActive: boolean;
  sortOrder: number;
};

export const createVariant = (
  productId: string,
  body: {
    name: string;
    priceCents: number;
    sku?: string;
    compareAtCents?: number;
    isActive?: boolean;
    sortOrder?: number;
    optionValueIds?: string[];
  },
) =>
  request<VariantItem>(`/v1/admin/products/${productId}/variants`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateVariant = (
  variantId: string,
  body: {
    name?: string;
    priceCents?: number;
    sku?: string;
    compareAtCents?: number;
    isActive?: boolean;
    optionValueIds?: string[];
  },
) =>
  request<VariantItem>(`/v1/admin/variants/${variantId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

// ─── Options ─────────────────────────────────────────────────────────────────

export const createOption = (productId: string, body: { name: string }) =>
  request<ProductOption>(`/v1/admin/products/${productId}/options`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateOption = (optionId: string, body: { name: string }) =>
  request<ProductOption>(`/v1/admin/options/${optionId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteOption = (optionId: string) =>
  request<{ message: string }>(`/v1/admin/options/${optionId}`, { method: "DELETE" });

export const createOptionValue = (optionId: string, body: { value: string; sortOrder?: number }) =>
  request<OptionValue>(`/v1/admin/options/${optionId}/values`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateOptionValue = (valueId: string, body: { value?: string; sortOrder?: number }) =>
  request<OptionValue>(`/v1/admin/option-values/${valueId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteOptionValue = (valueId: string) =>
  request<{ message: string }>(`/v1/admin/option-values/${valueId}`, { method: "DELETE" });

export const deleteVariant = (variantId: string) =>
  request<{ message: string }>(`/v1/admin/variants/${variantId}`, {
    method: "DELETE",
  });

// ─── Variations (bulk sync) ────────────────────────────────────────────────────
export type SyncVariationsBody = {
  dimensions: { name: string; values: string[] }[];
  rows: {
    values: string[];
    priceCents: number;
    stock: number;
    sku?: string | null;
    isActive?: boolean;
    compareAtCents?: number | null;
  }[];
};
export type SyncVariationsResult = {
  product: ProductDetail;
  blocked: { variantId: string; name: string }[];
};
export const syncVariations = (productId: string, body: SyncVariationsBody) =>
  request<SyncVariationsResult>(`/v1/admin/products/${productId}/variations`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

// ─── Orders ──────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "failed"
  | "refunded"
  | "cancelled"
  | "abandoned";

export type OrderLineItem = {
  productName: string;
  variantName: string;
  sku: string | null;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
};

export type AdminOrderSummary = {
  id: string;
  status: OrderStatus;
  email: string;
  itemCount: number;
  subtotalCents: number;
  totalCents: number;
  currency: string;
  shippingCountry: string | null;
  trackingNumber: string | null;
  createdAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
};

export type AdminOrderDetail = AdminOrderSummary & {
  shippingName: string | null;
  shippingLine1: string | null;
  shippingLine2: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingZip: string | null;
  shippingCents: number;
  taxCents: number;
  notes: string | null;
  stripePaymentIntentId: string | null;
  items: OrderLineItem[];
};

export type OrderListResponse = { items: AdminOrderSummary[]; total: number };

export const listOrders = (params?: {
  status?: OrderStatus | OrderStatus[];
  email?: string;
  limit?: number;
  offset?: number;
  sort?: "newest" | "oldest";
}) => {
  const qs = new URLSearchParams();
  if (params?.status) {
    const statuses = Array.isArray(params.status) ? params.status : [params.status];
    statuses.forEach((s) => qs.append("status", s));
  }
  if (params?.email) qs.set("email", params.email);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  if (params?.sort) qs.set("sort", params.sort);
  return request<OrderListResponse>(`/v1/admin/orders?${qs}`);
};

export const getOrder = (orderId: string) =>
  request<AdminOrderDetail>(`/v1/admin/orders/${orderId}`);

export const shipOrder = (orderId: string, trackingNumber: string) =>
  request<AdminOrderDetail>(`/v1/admin/orders/${orderId}/ship`, {
    method: "PATCH",
    body: JSON.stringify({ trackingNumber }),
  });

export const refundOrder = (orderId: string) =>
  request<AdminOrderDetail>(`/v1/admin/orders/${orderId}/refund`, {
    method: "POST",
    body: JSON.stringify({}),
  });

export const collectOrder = (orderId: string) =>
  request<AdminOrderDetail>(`/v1/admin/orders/${orderId}/collect`, {
    method: "POST",
    body: JSON.stringify({}),
  });

export const updateShippingAddress = (
  orderId: string,
  body: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    zip: string;
  },
) =>
  request<AdminOrderDetail>(`/v1/admin/orders/${orderId}/shipping-address`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

// ─── Collections ─────────────────────────────────────────────────────────────

export type CollectionItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  scheduled: boolean;
  goesLiveAt: string | null;
  productCount: number;
};

export type CollectionDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  scheduled: boolean;
  goesLiveAt: string | null;
  products: { id: string }[];
};

export const listCollections = () =>
  request<{ collections: CollectionItem[] }>("/v1/catalog/collections/");

export const getCollection = (slug: string) =>
  request<CollectionDetail>(`/v1/catalog/collections/${slug}`);

export const createCollection = (body: {
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
  goesLiveAt?: string | null;
}) =>
  request<CollectionItem>("/v1/admin/collections", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateCollection = (
  id: string,
  body: { name?: string; slug?: string; description?: string; goesLiveAt?: string | null },
) =>
  request<CollectionItem>(`/v1/admin/collections/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteCollection = (id: string) =>
  request<{ message: string }>(`/v1/admin/collections/${id}`, { method: "DELETE" });

export const addProductToCollection = (collectionId: string, productId: string) =>
  request<CollectionItem>(`/v1/admin/collections/${collectionId}/products`, {
    method: "POST",
    body: JSON.stringify({ productId }),
  });

// ─── Product Images ───────────────────────────────────────────────────────────

export type ProductImage = {
  id: string;
  productId: string;
  storeId: string;
  r2Key: string;
  cdnUrl: string;
  altText: string | null;
  sortOrder: number;
  createdAt: string;
};

export const listProductImages = (productId: string) =>
  request<ProductImage[]>(`/v1/admin/products/${productId}/images`);

export const getImageUploadUrl = (productId: string, contentType: string) =>
  request<{ uploadUrl: string; r2Key: string; cdnUrl: string }>(
    `/v1/admin/products/${productId}/images/upload-url`,
    { method: "POST", body: JSON.stringify({ contentType }) },
  );

export const confirmProductImage = (productId: string, r2Key: string, altText?: string) =>
  request<ProductImage>(`/v1/admin/products/${productId}/images/confirm`, {
    method: "POST",
    body: JSON.stringify({ r2Key, ...(altText ? { altText } : {}) }),
  });

export const deleteProductImage = (productId: string, imageId: string) =>
  request<{ message: string }>(`/v1/admin/products/${productId}/images/${imageId}`, {
    method: "DELETE",
  });

export const reorderProductImages = (
  productId: string,
  items: Array<{ imageId: string; sortOrder: number }>,
) =>
  request<ProductImage[]>(`/v1/admin/products/${productId}/images/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ items }),
  });

// ─── Inventory ────────────────────────────────────────────────────────────────

export type InventoryItem = {
  variantId: string;
  stock: number;
  reserved: number;
  available: number;
  allowBackorder: boolean;
  reservationTtlMinutes: number;
  updatedAt: string;
};

export type BulkInventoryItem = {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string | null;
  stock: number;
  reserved: number;
  available: number;
  allowBackorder: boolean;
};

export type ListInventoryParams = {
  limit?: number;
  offset?: number;
  stockFilter?: "all" | "low" | "out";
  threshold?: number;
};

export const listInventory = (params: ListInventoryParams = {}) => {
  const qs = new URLSearchParams();
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  if (params.offset !== undefined) qs.set("offset", String(params.offset));
  if (params.stockFilter) qs.set("stockFilter", params.stockFilter);
  if (params.threshold !== undefined) qs.set("threshold", String(params.threshold));
  const query = qs.toString();
  return request<{ items: BulkInventoryItem[]; total: number }>(
    `/v1/admin/inventory${query ? `?${query}` : ""}`,
  );
};

export const getInventory = (variantId: string) =>
  request<InventoryItem>(`/v1/admin/inventory/${variantId}`);

export const updateInventory = (
  variantId: string,
  body: { stock?: number; allowBackorder?: boolean; reason?: string },
) =>
  request<InventoryItem>(`/v1/admin/inventory/${variantId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

// ─── Analytics ────────────────────────────────────────────────────────────────

export type RevenuePeriod = { date: string; revenue: number; orderCount: number; aov: number };
export type RevenueDashboard = { periods: RevenuePeriod[] };

export type TopProductEntry = { productId: string; name: string; revenue: number };
export type TopProductsDashboard = {
  byRevenue: TopProductEntry[];
  byViews: Array<{ productId: string | null; name: string | null; views: number }>;
};

export const getAnalyticsRevenue = (from: string, to: string, period: "day" | "week" | "month") =>
  request<RevenueDashboard>(`/v1/admin/analytics/revenue?from=${from}&to=${to}&period=${period}`);

export const getAnalyticsTopProducts = (from: string, to: string, limit = 5) =>
  request<TopProductsDashboard>(
    `/v1/admin/analytics/top-products?from=${from}&to=${to}&limit=${limit}`,
  );

export type FunnelStage = {
  stage: "product_viewed" | "add_to_cart" | "checkout_started" | "order_completed";
  count: number;
  conversionRate: number | null;
};
export type FunnelResponse = { stages: FunnelStage[] };

export type AbandonedCartsResponse = {
  totalCartsWithItems: number;
  abandoned: number;
  abandonedRate: number;
};

export const getAnalyticsFunnel = (from: string, to: string) =>
  request<FunnelResponse>(`/v1/admin/analytics/funnel?from=${from}&to=${to}`);

export const getAnalyticsAbandonedCarts = (from: string, to: string) =>
  request<AbandonedCartsResponse>(`/v1/admin/analytics/abandoned-carts?from=${from}&to=${to}`);

export type AbandonedCartRow = {
  cartId: string;
  itemCount: number;
  estimatedValueCents: number;
  createdAt: string;
  lastActivityAt: string;
  isAnonymous: boolean;
};

export const getAnalyticsAbandonedCartsList = (from: string, to: string, limit = 20, offset = 0) =>
  request<{ items: AbandonedCartRow[]; total: number }>(
    `/v1/admin/analytics/abandoned-carts/list?from=${from}&to=${to}&limit=${limit}&offset=${offset}`,
  );

// Shipping
export type ShippingRate = {
  id: string;
  name: string;
  rateCents: number;
  minOrderCents?: number | null;
  estimatedDays?: number | null;
};

export type ShippingZone = {
  id: string;
  name: string;
  countries: string[];
  sortOrder: number;
  rates: ShippingRate[];
};

export const listShippingZones = () =>
  request<{ items: ShippingZone[] }>("/v1/admin/shipping/zones");

export const createShippingZone = (body: {
  name: string;
  countries: string[];
  sortOrder?: number;
}) =>
  request<ShippingZone>("/v1/admin/shipping/zones", { method: "POST", body: JSON.stringify(body) });

export const updateShippingZone = (
  zoneId: string,
  body: { name?: string; countries?: string[]; sortOrder?: number },
) =>
  request<ShippingZone>(`/v1/admin/shipping/zones/${zoneId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteShippingZone = (zoneId: string) =>
  request<{ message: string }>(`/v1/admin/shipping/zones/${zoneId}`, { method: "DELETE" });

export const createShippingRate = (
  zoneId: string,
  body: { name: string; rateCents: number; minOrderCents?: number; estimatedDays?: number },
) =>
  request<ShippingRate>(`/v1/admin/shipping/zones/${zoneId}/rates`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateShippingRate = (
  zoneId: string,
  rateId: string,
  body: { name?: string; rateCents?: number; minOrderCents?: number; estimatedDays?: number },
) =>
  request<ShippingRate>(`/v1/admin/shipping/zones/${zoneId}/rates/${rateId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteShippingRate = (zoneId: string, rateId: string) =>
  request<ShippingRate>(`/v1/admin/shipping/zones/${zoneId}/rates/${rateId}`, {
    method: "DELETE",
  });

// Webhooks
export type WebhookEvent =
  | "order.confirmed"
  | "order.shipped"
  | "order.delivered"
  | "order.refunded"
  | "return.requested"
  | "return.approved"
  | "return.refunded"
  | "inventory.low"
  | "product.published";

export type WebhookEndpoint = {
  id: string;
  url: string;
  events: WebhookEvent[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WebhookEndpointWithSecret = WebhookEndpoint & { secret: string };

export type WebhookDeliveryStatus = "pending" | "delivered" | "failed";

export type WebhookDelivery = {
  id: string;
  endpointId: string;
  event: string;
  status: WebhookDeliveryStatus;
  attemptCount: number;
  lastAttemptAt: string | null;
  responseStatus: number | null;
  createdAt: string;
};

export const listWebhookEndpoints = () => request<WebhookEndpoint[]>("/v1/admin/webhooks");

export const createWebhookEndpoint = (body: { url: string; events: WebhookEvent[] }) =>
  request<WebhookEndpointWithSecret>("/v1/admin/webhooks", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateWebhookEndpoint = (
  endpointId: string,
  body: { url?: string; events?: WebhookEvent[]; isActive?: boolean },
) =>
  request<WebhookEndpoint>(`/v1/admin/webhooks/${endpointId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteWebhookEndpoint = (endpointId: string) =>
  request<{}>(`/v1/admin/webhooks/${endpointId}`, { method: "DELETE" });

export const listWebhookDeliveries = (endpointId: string) =>
  request<WebhookDelivery[]>(`/v1/admin/webhooks/${endpointId}/deliveries`);
