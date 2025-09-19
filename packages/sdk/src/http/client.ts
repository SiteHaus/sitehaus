import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { getConfig } from "../config.js";
import { runSingleRefresh } from "../lock.js";

declare module "axios" {
  export interface AxiosRequestConfig {
    _skipAuth?: boolean;
    _retry?: boolean;
  }
}

export const api = axios.create({ withCredentials: true });

api.interceptors.request.use(async (config) => {
  const {
    clientKey,
    tokenProvider,
    proactiveRefreshSkewSec = 60,
  } = getConfig();

  config.headers = config.headers ?? {};
  config.headers["x-client-key"] = clientKey;

  if (config._skipAuth) return config;

  const t = tokenProvider?.();
  const now = Math.floor(Date.now() / 1000);

  if (t?.accessToken && t?.accessExpiration) {
    if (t.accessExpiration - now <= proactiveRefreshSkewSec) {
      await runSingleRefresh(refreshOnce);
    }
    config.headers.Authorization = `Bearer ${t.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (!original || original._retry || original._skipAuth) throw error;

    if (error.response?.status === 401) {
      original._retry = true;
      try {
        await runSingleRefresh(refreshOnce);
        return api(original);
      } catch {}
    }
    throw error;
  }
);

const refreshOnce = async () => {
  const { onAuthUpdate } = getConfig();
  const res = await api.post("/auth/refresh", undefined, {
    _skipAuth: true,
    _retry: true,
  });

  const { accessToken, accessTokenExpiresIn } =
    res.data ?? ({} as { accessToken: string; accessTokenExpirseIn: number });

  if (onAuthUpdate && accessToken && typeof accessTokenExpiresIn === "number") {
    const exp = Math.floor(Date.now() / 1000) + accessTokenExpiresIn;
    onAuthUpdate({ accessToken, accessExpiration: exp });
  }
};
