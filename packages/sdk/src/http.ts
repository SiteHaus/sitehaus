import { getConfig } from "./config.js";
import { refreshOnce, runSingleRefresh } from "./refresh.js";

export type FetchArgs = {
  url: string;
  method: string;
  headers?: HeadersInit;
  body?: unknown;
  rawBody?: BodyInit | null;
  fetchOptions?: RequestInit;
};

export const fetchWithAuth = async (args: FetchArgs): Promise<Response> => {
  const {
    clientKey,
    tokenProvider,
    proactiveRefreshSkewSec = 60,
  } = getConfig();

  const headers: Record<string, string> = {
    "x-client-key": clientKey,
    ...(args.headers as Record<string, string>),
  };

  const t = tokenProvider?.();
  const now = Math.floor(Date.now() / 1000);
  if (t?.accessToken && t?.accessExpiration) {
    if (t.accessExpiration - now <= proactiveRefreshSkewSec) {
      await runSingleRefresh(refreshOnce);
    }
  }

  const t2 = tokenProvider?.();
  if (t2?.accessToken) headers.Authorization = `Bearer ${t2.accessToken}`;

  const doFetch = () =>
    fetch(args.url, {
      method: args.method,
      credentials: "include",
      headers,
      body:
        args.rawBody ??
        (args.body !== undefined ? JSON.stringify(args.body) : undefined),
      signal: args.fetchOptions?.signal,
    });

  let res = await doFetch();

  if (res.status === 401) {
    try {
      await runSingleRefresh(refreshOnce);
      const t3 = tokenProvider?.();
      if (t3?.accessToken) headers.Authorization = `Bearer ${t3.accessToken}`;
      res = await doFetch();
    } catch {
      // swallow;
    }
  }

  return res;
};
