"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { getApi } from "@site-haus/stores/api";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSection,
} from "@site-haus/ui/components/base/form";
import { Input } from "@site-haus/ui/components/base/input";
import { Separator } from "@site-haus/ui/components/base/separator";
import { Textarea } from "@site-haus/ui/components/base/textarea";
import { ComboBoxField } from "@site-haus/ui/components/shared/combobox-field";
import {
  ticketPriorityEnum,
  ticketTypeEnum,
  type UpdateTicketInput,
  updateTicketSchema,
} from "@site-haus/validation/forms/ticket";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const typeOptions = ticketTypeEnum.options.map((v) => ({
  label: v.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
  value: v,
}));

const priorityOptions = ticketPriorityEnum.options.map((v) => ({
  label: v.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
  value: v,
}));

interface SubmitTicketFormProps {
  ticketId: string;
  defaultValues: UpdateTicketInput;
}

export function SubmitTicketForm({
  ticketId,
  defaultValues,
}: SubmitTicketFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const form = useForm<UpdateTicketInput>({
    resolver: zodResolver(updateTicketSchema),
    defaultValues,
  });

  const onSubmit = async (values: UpdateTicketInput) => {
    setSaving(true);
    try {
      const res = await getApi().tickets.update({
        params: { ticketId },
        body: values,
      });

      if (res.status === 200) {
        toast.success("Ticket updated");
        router.push(`/tickets/${ticketId}`);
      } else {
        toast.error("Failed to update ticket");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-4">
          <FormSection>General</FormSection>

          <div className="flex flex-col md:flex-row gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Title</FormLabel>
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

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <ComboBoxField
                field={field}
                name="priority"
                label="Priority"
                options={priorityOptions}
                form={form}
              />
            )}
          />
        </div>

        <Separator />

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}
