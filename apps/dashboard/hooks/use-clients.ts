import { getApi } from "@site-haus/stores/api";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export function useClients() {
  return useQuery({
    queryKey: queryKeys.clients.list(),
    queryFn: async () => {
      const res = await getApi().clients.meClients();
      if (res.status !== 200) throw new Error("Failed to fetch clients");
      return res.body.clients.filter((c) => !c.firstParty && !c.hidden);
    },
  });
}
