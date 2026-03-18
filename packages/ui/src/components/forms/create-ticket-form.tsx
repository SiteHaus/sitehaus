"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@site-haus/ui/components/base/form";
import { Input } from "@site-haus/ui/components/base/input";
import { Separator } from "@site-haus/ui/components/base/separator";
import { Textarea } from "@site-haus/ui/components/base/textarea";
import { ComboBoxField } from "@site-haus/ui/components/shared/combobox-field";
import {
  CreateTicketInput,
  createTicketSchema,
  ticketPriorityEnum,
  ticketTypeEnum,
} from "@site-haus/validation/forms/ticket";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

const ticketTypeOptions = ticketTypeEnum.options.map((value) => ({
  label: value.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
  value,
}));

const priorityTypeOptions = ticketPriorityEnum.options.map((value) => ({
  label: value.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
  value,
}));

export interface ProjectOption {
  id: string;
  name: string;
}

interface CreateTicketFormProps {
  projects: ProjectOption[];
  onSubmit: (values: CreateTicketInput) => Promise<void>;
  loading?: boolean;
}

export const CreateTicketForm = ({
  projects,
  onSubmit,
  loading,
}: CreateTicketFormProps) => {
  const form = useForm<CreateTicketInput>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      projectId: "",
      title: "",
      description: undefined,
      type: "request",
      priority: "normal",
    },
  });

  const projectOptions = projects.map((p) => ({
    label: p.name,
    value: p.id,
  }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="border bg-card rounded-xl shadow p-6 space-y-6">
          {/* Row 1: Project (full width — most important context) */}
          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <ComboBoxField
                field={field}
                name="projectId"
                label="Project"
                options={projectOptions}
                form={form}
              />
            )}
          />

          <Separator />

          {/* Row 2: Title (full width) */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ticket Title</FormLabel>
                <FormControl>
                  <Input placeholder="What do you need?" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Row 3: Type + Priority side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <ComboBoxField
                  field={field}
                  name="type"
                  label="Ticket Type"
                  options={ticketTypeOptions}
                  form={form}
                />
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
                  options={priorityTypeOptions}
                  form={form}
                />
              )}
            />
          </div>

          <Separator />

          {/* Row 4: Description (full width) */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell us more..."
                    className="min-h-[120px] resize-y"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Create Ticket
        </Button>
      </form>
    </Form>
  );
};
