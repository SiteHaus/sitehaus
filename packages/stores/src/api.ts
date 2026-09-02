import { apiContract } from "@site-haus/contracts";
import { apiFetcher, configureSDK } from "@site-haus/sdk";
import { initClient } from "@ts-rest/core";
import { useAuthStore } from "./auth-store.js";

const __clientType = () =>
  initClient(apiContract, {
    baseUrl: "" as string,
    api: (async () => ({
      status: 200,
      body: null,
      headers: new Headers(),
    })) as any,
  });

export type StoresInitOptions = {
  baseURL: string;
  clientKey: string;
  proactiveRefreshSkewSec?: number;
  targetClientIdProvider?: () => string | null;
};

export type Api = ReturnType<typeof __clientType>;

let configured = false;
let client: Api | null = null;

export function initStoresSdk(opts: StoresInitOptions) {
  if (configured && client) return client;

  configureSDK({
    baseURL: opts.baseURL,
    clientKey: opts.clientKey,
    proactiveRefreshSkewSec: opts.proactiveRefreshSkewSec ?? 60,
    targetClientIdProvider: opts.targetClientIdProvider,
    tokenProvider: () => {
      const s = useAuthStore.getState();
      return {
        accessToken: s.accessToken,
        accessExpiration: s.accessExpiration,
      };
    },
    onAuthUpdate: ({ accessToken, accessExpiration }) => {
      useAuthStore.getState().setAccess({ accessToken, accessExpiration });
    },
    onAuthFailure: () => {
      useAuthStore.getState().clearAuth();
    },
  });

  client = initClient(apiContract, { baseUrl: opts.baseURL, api: apiFetcher });
  configured = true;
  return client;
}

export function getApi() {
  if (!client) {
    throw new Error("Stores SDK not initialized. Call initStoresSdk(...) first.");
  }
  return client;
}

export function isStoresConfigured() {
  return configured;
}
