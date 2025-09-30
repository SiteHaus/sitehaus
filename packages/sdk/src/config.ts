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
};

let cfg: SDKConfig | null = null;
export const getConfig = () => {
  if (!cfg) throw new Error("SDK not configured");
  return cfg;
};

export const configureSDK = (c: SDKConfig) => {
  cfg = { proactiveRefreshSkewSec: 60, ...c };
};
