"use client";

import { getApi } from "@site-haus/stores/api";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@site-haus/ui/components/base/card";
import { Input } from "@site-haus/ui/components/base/input";
import { Label } from "@site-haus/ui/components/base/label";
import { Separator } from "@site-haus/ui/components/base/separator";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryKeys } from "@/lib/query-keys";

const schema = z.object({
  name: z.string().min(1, "Workspace name is required"),
});
type FormData = z.infer<typeof schema>;

export function CompanyTab() {
  const queryClient = useQueryClient();
  const canManage = useAuthStore((s) => s.hasPerm)("clients:manage");

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.clients.current(),
    queryFn: async () => {
      const res = await getApi().clients.getCurrent();
      if (res.status !== 200) throw new Error("Failed to load settings");
      return res.body.client;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (data) reset({ name: data.name });
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormData) => {
      const res = await getApi().clients.updateCurrent({ body: values });
      if (res.status !== 200) throw new Error("Failed to save");
      return res.body.client;
    },
    onSuccess: (updated) => {
      toast.success("Settings saved");
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.current() });
      reset({ name: updated.name });
    },
    onError: () => toast.error("Failed to save settings"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspace</CardTitle>
          <CardDescription>Your agency name as it appears across the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Workspace name</Label>
              <Input id="name" {...register("name")} placeholder="SiteHaus" disabled={!canManage} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Workspace key</Label>
              <Input value={data?.key ?? ""} disabled className="font-mono" />
              <p className="text-xs text-muted-foreground">
                The key is set at creation and cannot be changed.
              </p>
            </div>

            {!canManage && (
              <p className="text-xs text-muted-foreground">
                You need admin permissions to edit workspace settings.
              </p>
            )}

            {canManage && (
              <>
                <Separator />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={!isDirty || mutation.isPending}>
                    {mutation.isPending && <Spinner className="size-3.5 mr-2" />}
                    Save changes
                  </Button>
                </div>
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
