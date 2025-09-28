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

      const t2 = tokenProvider?.();
      if (t2?.accessToken) {
        config.headers.Authorization = `Bearer ${t2.accessToken}`;
      } else {
        config.headers.Authorization = `Bearer ${t.accessToken}`;
      }
    }
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
      } catch (e) {
        getConfig().onRefreshError?.(e);
      }
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

  const data = res.data as {
    accessToken?: string;
    accessTokenExpiresIn?: number;
  };

  if (
    onAuthUpdate &&
    data?.accessToken &&
    typeof data?.accessTokenExpiresIn === "number"
  ) {
    const exp = Math.floor(Date.now() / 1000) + data.accessTokenExpiresIn;
    onAuthUpdate({ accessToken: data?.accessToken, accessExpiration: exp });
  }
};

export const postPublic = <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
) => api.post<T>(url, data, { ...config, _skipAuth: true });

export const getPublic = <T = any>(url: string, config?: AxiosRequestConfig) =>
  api.get<T>(url, { ...config, _skipAuth: true });
