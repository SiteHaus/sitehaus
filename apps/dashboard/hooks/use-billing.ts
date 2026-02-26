"use client";

import type { AdminBillingOverview, BillingRecordItem } from "@site-haus/contracts";
import { getApi } from "@site-haus/stores/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";

export function useBillingAdmin() {
  const queryClient = useQueryClient();
  const key = queryKeys.billing.admin();

  const { data: overview = null, isLoading: loading } = useQuery<AdminBillingOverview | null>({
    queryKey: key,
    queryFn: async () => {
      const res = await getApi().billing.getAdminOverview();
      if (res.status !== 200) throw new Error("Failed to load billing overview");
      return res.body;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const createSubscriptionMutation = useMutation({
    mutationFn: (data: {
      clientId: string;
      projectId: string;
      amountCents: number;
      intervalMonths: number;
    }) => getApi().billing.createSubscription({ body: data }),
    onSuccess: (res) => {
      if (res.status === 201) {
        toast.success("Subscription created");
        void invalidate();
      } else {
        toast.error("Failed to create subscription");
      }
    },
    onError: () => toast.error("Something went wrong"),
  });

  const createOneTimeMutation = useMutation({
    mutationFn: (data: {
      clientId: string;
      projectId: string;
      amountCents: number;
      description?: string;
    }) => getApi().billing.createOneTime({ body: data }),
    onSuccess: (res) => {
      if (res.status === 201) {
        toast.success("Invoice created");
        void invalidate();
      } else {
        toast.error("Failed to create invoice");
      }
    },
    onError: () => toast.error("Something went wrong"),
  });

  return {
    overview,
    loading,
    refetch: invalidate,
    createSubscription: (data: Parameters<typeof createSubscriptionMutation.mutateAsync>[0]) =>
      createSubscriptionMutation.mutateAsync(data).then((r) => r.status === 201),
    createOneTime: (data: Parameters<typeof createOneTimeMutation.mutateAsync>[0]) =>
      createOneTimeMutation.mutateAsync(data).then((r) => r.status === 201),
  };
}

export function useBillingProject(projectId: string, clientId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.billing.project(projectId);

  const { data: records = [], isLoading: loading } = useQuery<BillingRecordItem[]>({
    queryKey: key,
    queryFn: async () => {
      const res = await getApi().billing.list({ query: { projectId } });
      if (res.status !== 200) throw new Error("Failed to load billing records");
      return res.body.records;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const createSubscriptionMutation = useMutation({
    mutationFn: (data: { amountCents: number; intervalMonths: number }) =>
      getApi().billing.createSubscription({ body: { clientId, projectId, ...data } }),
    onSuccess: (res) => {
      if (res.status === 201) {
        toast.success("Subscription created");
        void invalidate();
      } else {
        toast.error("Failed to create subscription");
      }
    },
    onError: () => toast.error("Something went wrong"),
  });

  const createOneTimeMutation = useMutation({
    mutationFn: (data: { amountCents: number; description?: string }) =>
      getApi().billing.createOneTime({ body: { clientId, projectId, ...data } }),
    onSuccess: (res) => {
      if (res.status === 201) {
        toast.success("Invoice created");
        void invalidate();
      } else {
        toast.error("Failed to create invoice");
      }
    },
    onError: () => toast.error("Something went wrong"),
  });

  return {
    records,
    loading,
    refetch: invalidate,
    createSubscription: (data: Parameters<typeof createSubscriptionMutation.mutateAsync>[0]) =>
      createSubscriptionMutation.mutateAsync(data).then((r) => r.status === 201),
    createOneTime: (data: Parameters<typeof createOneTimeMutation.mutateAsync>[0]) =>
      createOneTimeMutation.mutateAsync(data).then((r) => r.status === 201),
  };
}

export function useBillingClient() {
  const { data: records = [], isLoading: loading } = useQuery<BillingRecordItem[]>({
    queryKey: queryKeys.billing.client(),
    queryFn: async () => {
      const res = await getApi().billing.list({ query: {} });
      if (res.status !== 200) throw new Error("Failed to load billing records");
      return res.body.records;
    },
  });

  const openPortal = async () => {
    try {
      const res = await getApi().billing.getPortalUrl();
      if (res.status === 200) {
        window.open(res.body.url, "_blank");
      } else {
        toast.error("Could not open billing portal");
      }
    } catch {
      toast.error("Something went wrong");
    }
  };

  return { records, loading, refetch: () => {}, openPortal };
}
