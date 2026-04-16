export type TokenProvider = () => {
  accessToken: string | null;
  accessExpiration: number | null;
};

export type SDKConfig = {
  baseURL: string;
  clientKey: string;
  tokenProvider: TokenProvider;
  onAuthUpdate?: (p: { accessToken: string; accessExpiration: number }) => void;
  proactiveRefreshSkewSec?: number;
  targetClientIdProvider?: () => string | null;
};

const CLIENT_KEY_STORAGE_KEY = "_sh_client_key";

const readStoredClientKey = (): string | null => {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(CLIENT_KEY_STORAGE_KEY);
};

let cfg: SDKConfig | null = null;

export const configureSDK = (c: SDKConfig) => {
  const storedClientKey = readStoredClientKey();
  cfg = { proactiveRefreshSkewSec: 60, ...c, clientKey: storedClientKey ?? c.clientKey };
};

export const updateSDKClientKey = (clientKey: string) => {
  if (cfg) cfg = { ...cfg, clientKey };
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(CLIENT_KEY_STORAGE_KEY, clientKey);
  }
};

export const getConfig = () => {
  if (!cfg) throw new Error("SDK not configured");
  return cfg;
};
