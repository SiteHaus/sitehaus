import { apiContract } from "@site-haus/contracts";
import { apiFetcher, configureSDK, getConfig } from "@site-haus/sdk";
import { initClient } from "@ts-rest/core";
import { useAuthStore } from "./auth-store.js";

let configured = false;
let client: any = null;

export const configureStoresSdk = (opts: {
  baseURL: string;
  clientKey: string;
  proactiveRefreshSkewSec?: number;
}) => {
  if (configured) return;

  const baseURL = opts.baseURL;
  const clientKey = opts.clientKey;
  const skew = opts?.proactiveRefreshSkewSec ?? 60;

  configureSDK({
    baseURL,
    clientKey,
    proactiveRefreshSkewSec: skew,
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
  });

  configured = true;
};

export const getApi = () => {
  if (!client) {
    if (!configured) {
      throw new Error(
        "[x] SITE HAUS INTERNAL -> configureStoresSdk must be called before getApi()"
      );
    }

    const { baseURL } = getConfig();
    client = initClient(apiContract, { baseUrl: baseURL, api: apiFetcher });
  }

  return client;
};
