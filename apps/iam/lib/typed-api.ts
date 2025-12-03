import { getApi } from "@site-haus/stores/api";

type Api = ReturnType<typeof getApi>;

export const useApi = (): Api => {
  return getApi() as Api;
};
