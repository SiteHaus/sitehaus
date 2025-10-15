import { apiContract } from "@site-haus/contracts";
import { apiFetcher, configureSDK } from "@site-haus/sdk";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { initClient } from "@ts-rest/core";

let configured = false;

export const ensureSdkConfigured = () => {
  if (configured) return;

  configureSDK({
    baseURL: process.env.NEXT_PUBLIC_API_URL!,
    clientKey: process.env.NEXT_PUBLIC_CLIENT_KEY!,
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
    proactiveRefreshSkewSec: 60,
  });

  configured = true;
};

const client = initClient(apiContract, {
  baseUrl: process.env.NEXT_PUBLIC_API_URL!,
  api: apiFetcher,
});

const getApi = () => {
  ensureSdkConfigured();
  return client;
};
