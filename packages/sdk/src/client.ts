import { apiContract } from "@site-haus/contracts";
import { ApiFetcherArgs, initClient, tsRestFetchApi } from "@ts-rest/core";
import { getConfig } from "./config.js";
import { refreshOnce, runSingleRefresh } from "./refresh.js";

const tinyApi = async (args: ApiFetcherArgs) => {
  const {
    clientKey,
    tokenProvider,
    proactiveRefreshSkewSec = 60,
  } = getConfig();

  const headers: Record<string, string> = {
    ...(args.headers ?? {}),
    "x-client-key": clientKey,
  };

  const t = tokenProvider?.();
  const now = Math.floor(Date.now() / 1000);
  if (
    t?.accessToken &&
    t?.accessExpiration &&
    t.accessExpiration - now <= proactiveRefreshSkewSec
  ) {
    await runSingleRefresh(refreshOnce);
  }

  const t2 = tokenProvider?.();
  if (t2?.accessToken) headers.Authorization = `Bearer ${t2.accessToken}`;

  return tsRestFetchApi({
    ...args,
    headers,
    fetchOptions: { credentials: "include", ...(args.fetchOptions ?? {}) },
  });
};

export const createApiClient = () => {
  initClient(apiContract, {
    baseUrl: getConfig().baseURL,
    credentials: "include",
    api: tinyApi,
  });
};

export type ApiClient = ReturnType<typeof createApiClient>;
