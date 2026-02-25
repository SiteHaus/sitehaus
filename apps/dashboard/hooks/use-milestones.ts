"use client";

import type { MilestoneItem } from "@site-haus/contracts";
import { getApi } from "@site-haus/stores/api";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function useMilestones(projectId: string) {
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getApi().milestones.list({ params: { projectId } });
      if (res.status === 200) {
        setMilestones(res.body.milestones);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (data: {
      name: string;
      description?: string | null;
      dueDate?: string | null;
    }) => {
      try {
        const res = await getApi().milestones.create({
          params: { projectId },
          body: {
            name: data.name,
            ...(data.description ? { description: data.description } : {}),
            ...(data.dueDate ? { dueDate: data.dueDate } : {}),
          },
        });
        if (res.status === 201) {
          setMilestones((prev) => [...prev, res.body.milestone]);
          toast.success("Milestone created");
          return true;
        } else {
          toast.error("Failed to create milestone");
        }
      } catch {
        toast.error("Something went wrong");
      }
      return false;
    },
    [projectId]
  );

  const update = useCallback(
    async (
      milestoneId: string,
      data: {
        name?: string;
        description?: string | null;
        status?: MilestoneItem["status"];
        dueDate?: string | null;
      }
    ) => {
      try {
        const res = await getApi().milestones.update({
          params: { milestoneId },
          body: data,
        });
        if (res.status === 200) {
          setMilestones((prev) =>
            prev.map((m) => (m.id === milestoneId ? res.body.milestone : m))
          );
          toast.success("Milestone updated");
          return true;
        } else {
          toast.error("Failed to update milestone");
        }
      } catch {
        toast.error("Something went wrong");
      }
      return false;
    },
    []
  );

  const remove = useCallback(async (milestoneId: string) => {
    try {
      const res = await getApi().milestones.delete({
        params: { milestoneId },
        body: undefined,
      });
      if (res.status === 204) {
        setMilestones((prev) => prev.filter((m) => m.id !== milestoneId));
        toast.success("Milestone deleted");
        return true;
      } else {
        toast.error("Failed to delete milestone");
      }
    } catch {
      toast.error("Something went wrong");
    }
    return false;
  }, []);

  const signOff = useCallback(async (milestoneId: string) => {
    try {
      const res = await getApi().milestones.signOff({
        params: { milestoneId },
        body: undefined,
      });
      if (res.status === 200) {
        setMilestones((prev) =>
          prev.map((m) => (m.id === milestoneId ? res.body.milestone : m))
        );
        toast.success("Milestone signed off");
        return true;
      } else {
        toast.error("Failed to sign off milestone");
      }
    } catch {
      toast.error("Something went wrong");
    }
    return false;
  }, []);

  const reorder = useCallback(
    async (orderedIds: string[]) => {
      // Optimistic update
      setMilestones((prev) => {
        const map = new Map(prev.map((m) => [m.id, m]));
        return orderedIds
          .map((id, i) => {
            const m = map.get(id);
            return m ? { ...m, sortOrder: i } : null;
          })
          .filter(Boolean) as MilestoneItem[];
      });
      try {
        await getApi().milestones.reorder({ body: { orderedIds } });
      } catch {
        load();
        toast.error("Failed to reorder milestones");
      }
    },
    [load]
  );

  return { milestones, loading, load, create, update, remove, signOff, reorder };
}
