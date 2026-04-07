// Re-export from @site-haus/sdk
export { configureSDK, getConfig, type SDKConfig, type TokenProvider } from "@site-haus/sdk";

export { apiFetcher } from "@site-haus/sdk";
export { fetchWithAuth, type FetchArgs } from "@site-haus/sdk";
export { refreshOnce } from "@site-haus/sdk";
export { runSingleRefresh } from "@site-haus/sdk";

// OAuth helpers
export {
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  generatePKCE,
  generateState,
  type TokenResponse,
} from "@site-haus/sdk/oauth";

// Re-export from @site-haus/stores
export { initStoresSdk, getApi, isStoresConfigured } from "@site-haus/stores/api";
export type { StoresInitOptions, Api } from "@site-haus/stores/api";
export { useAuthStore } from "@site-haus/stores/auth-store";

// Re-export contracts for type-safe API calls
export { apiContract } from "@site-haus/contracts";
export type { MeUser, MeSession } from "@site-haus/contracts";
