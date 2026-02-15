"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type ProjectItem } from "@site-haus/contracts";
import { getApi } from "@site-haus/stores/api";
import { Button } from "@site-haus/ui/components/base/button";
import { Calendar } from "@site-haus/ui/components/base/calendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@site-haus/ui/components/base/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@site-haus/ui/components/base/form";
import { Input } from "@site-haus/ui/components/base/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@site-haus/ui/components/base/popover";
import { Separator } from "@site-haus/ui/components/base/separator";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { Textarea } from "@site-haus/ui/components/base/textarea";
import { ComboBoxField } from "@site-haus/ui/components/shared/combobox-field";
import { cn } from "@site-haus/ui/lib/utils";
import {
  projectBillingStatusEnum,
  projectStatusEnum,
  projectTypeEnum,
  type UpdateProjectInput,
  updateProjectSchema,
} from "@site-haus/validation/forms/project";
import { format } from "date-fns";
import { ArrowLeft, CalendarIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const statusOptions = projectStatusEnum.options.map((v) => ({
  label: v.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
  value: v,
}));
const typeOptions = projectTypeEnum.options.map((v) => ({
  label: v.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
  value: v,
}));
const billingOptions = projectBillingStatusEnum.options.map((v) => ({
  label: v.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
  value: v,
}));

export default function EditProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [project, setProject] = useState<ProjectItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<UpdateProjectInput>({
    resolver: zodResolver(updateProjectSchema),
  });

  const fetchProject = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getApi().projects.get({ params: { projectId } });
      if (res.status === 200) {
        const p = res.body.project;
        setProject(p);
        form.reset({
          name: p.name,
          description: p.description ?? undefined,
          type: p.type,
          siteDomain: p.siteDomain ?? undefined,
          stagingDomain: p.stagingDomain ?? undefined,
          repoUrl: p.repoUrl ?? undefined,
          monthlyRateCents: p.monthlyRateCents ?? undefined,
          depositAmountCents: p.depositAmountCents ?? undefined,
          billingStatus: p.billingStatus ?? undefined,
          isActive: p.isActive ?? true,
          startDate: p.startDate ?? undefined,
          dueDate: p.dueDate ?? undefined,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, form]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const onSubmit = async (values: UpdateProjectInput) => {
    setSaving(true);
    try {
      const res = await getApi().projects.update({
        params: { projectId },
        body: values,
      });
      if (res.status === 200) {
        toast.success("Project updated");
        router.push(`/projects/${projectId}`);
      } else {
        toast.error("Failed to update project");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h3 className="text-lg font-medium">Project not found</h3>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link href={`/projects/${projectId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Project
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit {project.name}</h1>
        <p className="text-muted-foreground mt-1">
          Update project details below.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <ComboBoxField
                      field={field}
                      name="type"
                      label="Type"
                      options={typeOptions}
                      form={form}
                    />
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col md:flex-row gap-4">
                <FormField
                  control={form.control}
                  name="billingStatus"
                  render={({ field }) => (
                    <ComboBoxField
                      field={field}
                      name="billingStatus"
                      label="Billing Status"
                      options={billingOptions}
                      form={form}
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Domains & Repository</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <FormField
                  control={form.control}
                  name="siteDomain"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Domain</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="example.com"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stagingDomain"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Staging Domain</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="staging.example.com"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="repoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repository URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://github.com/..."
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <FormField
                  control={form.control}
                  name="monthlyRateCents"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Monthly Rate (cents)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="15000"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="depositAmountCents"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Deposit Amount (cents)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="50000"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "text-left font-normal w-full",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={
                              field.value ? new Date(field.value) : undefined
                            }
                            onSelect={(date) =>
                              field.onChange(date?.toISOString() ?? null)
                            }
                            captionLayout="dropdown"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "text-left font-normal w-full",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={
                              field.value ? new Date(field.value) : undefined
                            }
                            onSelect={(date) =>
                              field.onChange(date?.toISOString() ?? null)
                            }
                            captionLayout="dropdown"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={`/projects/${projectId}`}>Cancel</Link>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
