import { apiContract } from "@site-haus/contracts";
import { getApi } from "@site-haus/stores/api";
import { initClient } from "@ts-rest/core";

const __clientType = () =>
  initClient(apiContract, {
    baseUrl: "" as string,
    api: (async () => ({
      status: 200,
      body: null,
      headers: new Headers(),
    })) as any,
  });

type Api = ReturnType<typeof __clientType>;

export const useApi = (): Api => {
  return getApi() as Api;
};
