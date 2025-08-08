"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@site-haus/ui/components/base/button";
import { Calendar } from "@site-haus/ui/components/base/calendar";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@site-haus/ui/components/base/tabs";
import { Textarea } from "@site-haus/ui/components/base/textarea";
import { ComboBoxField } from "@site-haus/ui/components/shared/combobox-field";
import { cn } from "@site-haus/ui/lib/utils";
import {
  CreateProjectInput,
  createProjectSchema,
  projectBillingStatusEnum,
  projectStatusEnum,
  projectTypeEnum,
} from "@site-haus/validation/forms/project";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";

const projectStatusOptions = projectStatusEnum.options.map((value) => ({
  label: value.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
  value,
}));
const projectTypeOptions = projectTypeEnum.options.map((value) => ({
  label: value.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
  value,
}));
const projectBillingStatusOptions = projectBillingStatusEnum.options.map(
  (value) => ({
    label: value.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
    value,
  })
);

export const CreateProjectForm = () => {
  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: undefined,
      type: "marketing",
      status: "submitted",
      billingStatus: "pending",
      siteDomain: undefined,
      stagingDomain: undefined,
      repoUrl: undefined,
      monthlyRateCents: undefined,
      depositAmountCents: undefined,
      isActive: true,
      startDate: undefined,
      dueDate: undefined,
      launchedAt: undefined,
    },
  });

  const onSubmit = (values: CreateProjectInput) => {
    console.log(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="details">More Details</TabsTrigger>
          </TabsList>
          <TabsContent
            value="general"
            className="space-y-2 border p-4 rounded-xl shadow"
          >
            <h2 className="text-xl font-bold mb-6">General Project Details</h2>

            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <ComboBoxField
                    field={field}
                    name="status"
                    label="Project Status"
                    options={projectStatusOptions}
                    form={form}
                  />
                )}
              />

              <FormField
                control={form.control}
                name="billingStatus"
                render={({ field }) => (
                  <ComboBoxField
                    field={field}
                    name="billingStatus"
                    label="Billing Status"
                    options={projectBillingStatusOptions}
                    form={form}
                  />
                )}
              />
            </div>

            <Separator className="my-4" />

            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Lunas Portfolio" {...field} />
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
                    label="Project Type"
                    options={projectTypeOptions}
                    form={form}
                  />
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="mt-4">
              Submit
            </Button>
          </TabsContent>
          <TabsContent
            value="details"
            className="space-y-2 border p-4 rounded-xl shadow"
          >
            <h2 className="text-xl font-bold mb-6">Domains</h2>

            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="repoUrl"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Repository URL</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="siteDomain"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Domain</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <h2 className="text-xl font-bold mb-6">Dates</h2>

            <div className="flex gap-2">
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
                            variant={"outline"}
                            className={cn(
                              "text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
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
                          selected={field.value}
                          onSelect={field.onChange}
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
                            variant={"outline"}
                            className={cn(
                              "text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
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
                          selected={field.value}
                          onSelect={field.onChange}
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
                name="launchedAt"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Launched At</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
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
                          selected={field.value}
                          onSelect={field.onChange}
                          captionLayout="dropdown"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="mt-4">
              Submit
            </Button>
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
};
