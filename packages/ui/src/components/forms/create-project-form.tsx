"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@site-haus/ui/components/base/button";
import { Calendar } from "@site-haus/ui/components/base/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@site-haus/ui/components/base/dialog";
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
  projectTypeEnum,
} from "@site-haus/validation/forms/project";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Plus } from "lucide-react";
import { ReactNode, useState } from "react";
import { useForm } from "react-hook-form";

const projectTypeOptions = projectTypeEnum.options.map((value) => ({
  label: value.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
  value,
}));

export const FormGroup = ({ children }: { children: ReactNode }) => {
  return <div className="flex flex-col md:flex-row gap-2">{children}</div>;
};

export interface ClientOption {
  id: string;
  name: string;
}

interface CreateProjectFormProps {
  clients: ClientOption[];
  onSubmit: (values: CreateProjectInput) => Promise<void>;
  onCreateClient?: (name: string) => Promise<ClientOption | null>;
  loading?: boolean;
}

export const CreateProjectForm = ({
  clients,
  onSubmit,
  onCreateClient,
  loading,
}: CreateProjectFormProps) => {
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientList, setClientList] = useState<ClientOption[]>(clients);

  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      clientId: "",
      name: "",
      description: undefined,
      type: "marketing",
      siteDomain: undefined,
      stagingDomain: undefined,
      repoUrl: undefined,
      monthlyRateCents: undefined,
      depositAmountCents: undefined,
      startDate: undefined,
      dueDate: undefined,
    },
  });

  const handleSubmit = async (values: CreateProjectInput) => {
    await onSubmit(values);
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim() || !onCreateClient) return;
    setCreatingClient(true);
    try {
      const created = await onCreateClient(newClientName.trim());
      if (created) {
        setClientList((prev) => [...prev, created]);
        form.setValue("clientId", created.id);
        setShowNewClient(false);
        setNewClientName("");
      }
    } finally {
      setCreatingClient(false);
    }
  };

  const clientOptions = clientList.map((c) => ({
    label: c.name,
    value: c.id,
  }));

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <Tabs defaultValue="general">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="details">More Details</TabsTrigger>
            </TabsList>
            <TabsContent
              value="general"
              className="space-y-2 border p-4 rounded-xl shadow"
            >
              <h2 className="text-xl font-bold mb-6">
                General Project Details
              </h2>

              <div className="flex flex-col md:flex-row gap-2 items-end">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <ComboBoxField
                      field={field}
                      name="clientId"
                      label="Client"
                      options={clientOptions}
                      form={form}
                    />
                  )}
                />
                {onCreateClient && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mb-0.5 shrink-0"
                    onClick={() => setShowNewClient(true)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    New Client
                  </Button>
                )}
              </div>

              <Separator className="my-2" />

              <FormGroup>
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
              </FormGroup>
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

              <Button type="submit" className="mt-4" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            </TabsContent>
            <TabsContent
              value="details"
              className="space-y-2 border p-4 rounded-xl shadow"
            >
              <h2 className="text-xl font-bold mb-6">More Project Details</h2>

              <FormGroup>
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
              </FormGroup>

              <Separator className="my-4" />

              <FormGroup>
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
                            selected={
                              field.value ? new Date(field.value) : undefined
                            }
                            onSelect={(date) =>
                              field.onChange(date?.toISOString())
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
                            selected={
                              field.value ? new Date(field.value) : undefined
                            }
                            onSelect={(date) =>
                              field.onChange(date?.toISOString())
                            }
                            captionLayout="dropdown"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>

              <Button type="submit" className="mt-4" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            </TabsContent>
          </Tabs>
        </form>
      </Form>

      <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Client Name</label>
              <Input
                placeholder="BearFoot Coffee"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateClient();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                This creates a new organization for your client.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewClient(false)}
              disabled={creatingClient}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateClient}
              disabled={!newClientName.trim() || creatingClient}
            >
              {creatingClient && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
