"use client";

import type { TicketAttachment } from "@site-haus/contracts";
import { getApi } from "@site-haus/stores/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";

export function useTicketAttachments(ticketId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.tickets.attachments(ticketId);

  const { data, isLoading: loading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const res = await getApi().tickets.listAttachments({ params: { ticketId } });
      if (res.status !== 200) throw new Error("Failed to load attachments");
      return res.body.attachments;
    },
    enabled: !!ticketId,
  });

  const attachments = data ?? [];

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const uploaded: TicketAttachment[] = [];
      for (const file of files) {
        const res = await getApi().tickets.uploadAttachment({
          params: { ticketId },
          body: { file },
        });
        if (res.status === 201) {
          uploaded.push(res.body.attachment);
          toast.success(`${file.name} uploaded`);
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }
      }
      return uploaded;
    },
    onSuccess: (uploaded) => {
      if (uploaded.length > 0) {
        queryClient.setQueryData<TicketAttachment[]>(key, (prev) => [...uploaded, ...(prev ?? [])]);
      }
    },
    onError: () => toast.error("Upload failed"),
  });

  const removeMutation = useMutation({
    mutationFn: (attachmentId: string) =>
      getApi().tickets.deleteAttachment({ params: { ticketId, attachmentId } }),
    onSuccess: (res, attachmentId) => {
      if (res.status === 204) {
        queryClient.setQueryData<TicketAttachment[]>(key, (prev) =>
          (prev ?? []).filter((a) => a.id !== attachmentId),
        );
        toast.success("Attachment deleted");
      } else {
        toast.error("Failed to delete attachment");
      }
    },
    onError: () => toast.error("Something went wrong"),
  });

  return {
    attachments,
    loading,
    uploading: uploadMutation.isPending,
    upload: (files: File[]) => uploadMutation.mutateAsync(files),
    remove: (attachmentId: string) => removeMutation.mutateAsync(attachmentId),
  };
}
