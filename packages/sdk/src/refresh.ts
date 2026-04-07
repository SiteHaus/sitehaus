import { getConfig } from "./config.js";

export const refreshOnce = async () => {
  const { baseURL, clientKey, onAuthUpdate } = getConfig();

  const resp = await fetch(`${baseURL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "x-client-key": clientKey },
  });

  if (!resp.ok) throw new Error("Refresh Failed.");

  const data = (await resp.json()) as {
    accessToken?: string;
    accessTokenExpiresIn?: number;
  };

  if (onAuthUpdate && data.accessToken && typeof data.accessTokenExpiresIn === "number") {
    const exp = Math.floor(Date.now() / 1000) + data.accessTokenExpiresIn;
    onAuthUpdate({ accessToken: data.accessToken, accessExpiration: exp });
  }
};
