"use client";

import type { MilestoneItem } from "@site-haus/contracts";
import { getApi } from "@site-haus/stores/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";

export function useMilestones(projectId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.milestones.list(projectId);

  const { data: milestones = [], isLoading: loading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const res = await getApi().milestones.list({ params: { projectId } });
      if (res.status !== 200) throw new Error("Failed to load milestones");
      return res.body.milestones;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string | null; dueDate?: string | null }) =>
      getApi().milestones.create({
        params: { projectId },
        body: {
          name: data.name,
          ...(data.description ? { description: data.description } : {}),
          ...(data.dueDate ? { dueDate: data.dueDate } : {}),
        },
      }),
    onSuccess: (res) => {
      if (res.status === 201) {
        queryClient.setQueryData<MilestoneItem[]>(key, (prev = []) => [
          ...prev,
          res.body.milestone,
        ]);
        toast.success("Milestone created");
      } else {
        toast.error("Failed to create milestone");
      }
    },
    onError: () => toast.error("Something went wrong"),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      milestoneId,
      data,
    }: {
      milestoneId: string;
      data: {
        name?: string;
        description?: string | null;
        status?: MilestoneItem["status"];
        dueDate?: string | null;
      };
    }) => getApi().milestones.update({ params: { milestoneId }, body: data }),
    onSuccess: (res) => {
      if (res.status === 200) {
        queryClient.setQueryData<MilestoneItem[]>(key, (prev = []) =>
          prev.map((m) => (m.id === res.body.milestone.id ? res.body.milestone : m)),
        );
        toast.success("Milestone updated");
      } else {
        toast.error("Failed to update milestone");
      }
    },
    onError: () => toast.error("Something went wrong"),
  });

  const removeMutation = useMutation({
    mutationFn: (milestoneId: string) =>
      getApi().milestones.delete({ params: { milestoneId }, body: undefined }),
    onSuccess: (res, milestoneId) => {
      if (res.status === 204) {
        queryClient.setQueryData<MilestoneItem[]>(key, (prev = []) =>
          prev.filter((m) => m.id !== milestoneId),
        );
        toast.success("Milestone deleted");
      } else {
        toast.error("Failed to delete milestone");
      }
    },
    onError: () => toast.error("Something went wrong"),
  });

  const signOffMutation = useMutation({
    mutationFn: (milestoneId: string) =>
      getApi().milestones.signOff({ params: { milestoneId }, body: undefined }),
    onSuccess: (res) => {
      if (res.status === 200) {
        queryClient.setQueryData<MilestoneItem[]>(key, (prev = []) =>
          prev.map((m) => (m.id === res.body.milestone.id ? res.body.milestone : m)),
        );
        toast.success("Milestone signed off");
      } else {
        toast.error("Failed to sign off milestone");
      }
    },
    onError: () => toast.error("Something went wrong"),
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => getApi().milestones.reorder({ body: { orderedIds } }),
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MilestoneItem[]>(key);
      queryClient.setQueryData<MilestoneItem[]>(key, (prev = []) => {
        const map = new Map(prev.map((m) => [m.id, m]));
        return orderedIds
          .map((id, i) => {
            const m = map.get(id);
            return m ? { ...m, sortOrder: i } : null;
          })
          .filter(Boolean) as MilestoneItem[];
      });
      return { previous };
    },
    onError: (_err, _ids, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(key, ctx.previous);
      }
      toast.error("Failed to reorder milestones");
    },
  });

  return {
    milestones,
    loading,
    load: invalidate,
    create: (data: Parameters<typeof createMutation.mutateAsync>[0]) =>
      createMutation.mutateAsync(data).then((r) => r.status === 201),
    update: (milestoneId: string, data: Parameters<typeof updateMutation.mutateAsync>[0]["data"]) =>
      updateMutation.mutateAsync({ milestoneId, data }).then((r) => r.status === 200),
    remove: (milestoneId: string) =>
      removeMutation.mutateAsync(milestoneId).then((r) => r.status === 204),
    signOff: (milestoneId: string) =>
      signOffMutation.mutateAsync(milestoneId).then((r) => r.status === 200),
    reorder: (orderedIds: string[]) => reorderMutation.mutateAsync(orderedIds),
  };
}
