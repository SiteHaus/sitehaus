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
  FormSection,
} from "@site-haus/ui/components/base/form";
import { Input } from "@site-haus/ui/components/base/input";
import { Popover, PopoverContent, PopoverTrigger } from "@site-haus/ui/components/base/popover";
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
import { useState } from "react";
import { useForm } from "react-hook-form";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const projectTypeOptions = projectTypeEnum.options.map((value) => ({
  label: value.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
  value,
}));

export interface ClientOption {
  id: string;
  name: string;
}

interface CreateProjectFormProps {
  clients: ClientOption[];
  onSubmit: (values: CreateProjectInput) => Promise<void>;
  onCreateClient?: (name: string, key: string, audience: string) => Promise<ClientOption | null>;
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
  const [newClientKey, setNewClientKey] = useState("");
  const [newClientAudience, setNewClientAudience] = useState("");
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);
  const [audienceManuallyEdited, setAudienceManuallyEdited] = useState(false);
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

  const handleNewClientNameChange = (name: string) => {
    setNewClientName(name);
    if (!keyManuallyEdited) {
      const key = slugify(name);
      setNewClientKey(key);
      if (!audienceManuallyEdited) setNewClientAudience(`https://${key}.sitehaus.dev`);
    }
  };

  const handleNewClientKeyChange = (key: string) => {
    const slugged = slugify(key);
    setNewClientKey(slugged);
    setKeyManuallyEdited(true);
    if (!audienceManuallyEdited) setNewClientAudience(`https://${slugged}.sitehaus.dev`);
  };

  const handleNewClientAudienceChange = (audience: string) => {
    setNewClientAudience(audience);
    setAudienceManuallyEdited(true);
  };

  const handleCreateClient = async () => {
    if (
      !newClientName.trim() ||
      !newClientKey.trim() ||
      !newClientAudience.trim() ||
      !onCreateClient
    )
      return;
    setCreatingClient(true);
    try {
      const created = await onCreateClient(
        newClientName.trim(),
        newClientKey.trim(),
        newClientAudience.trim(),
      );
      if (created) {
        setClientList((prev) => [...prev, created]);
        form.setValue("clientId", created.id);
        setShowNewClient(false);
        setNewClientName("");
        setNewClientKey("");
        setNewClientAudience("");
        setKeyManuallyEdited(false);
        setAudienceManuallyEdited(false);
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
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          {/* Client */}
          <div className="space-y-4">
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
          </div>

          {/* General */}
          <div className="space-y-4">
            <FormSection>General</FormSection>
            <div className="flex flex-col md:flex-row gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Luna's Portfolio" {...field} />
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
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Brief description of the project..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Technical */}
          <div className="space-y-4">
            <FormSection>Technical</FormSection>
            <div className="flex flex-col md:flex-row gap-4">
              <FormField
                control={form.control}
                name="repoUrl"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Repository URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://github.com/org/repo" {...field} />
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
                      <Input placeholder="example.com" {...field} />
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
                      <Input placeholder="staging.example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <FormSection>Timeline</FormSection>
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
                              "w-full text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date?.toISOString())}
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
                              "w-full text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date?.toISOString())}
                          captionLayout="dropdown"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Project <Plus />
          </Button>
        </form>
      </Form>

      <Dialog
        open={showNewClient}
        onOpenChange={(open) => {
          setShowNewClient(open);
          if (!open) {
            setNewClientName("");
            setNewClientKey("");
            setNewClientAudience("");
            setKeyManuallyEdited(false);
            setAudienceManuallyEdited(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Display Name</label>
              <Input
                placeholder="BearFoot Coffee"
                value={newClientName}
                onChange={(e) => handleNewClientNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateClient();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Key</label>
              <Input
                placeholder="bearfoot-coffee"
                value={newClientKey}
                onChange={(e) => handleNewClientKeyChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateClient();
                  }
                }}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier — auto-derived from the name, lowercase with hyphens.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Audience</label>
              <Input
                placeholder="https://bearfoot-coffee.sitehaus.dev"
                value={newClientAudience}
                onChange={(e) => handleNewClientAudienceChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateClient();
                  }
                }}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                The JWT audience claim for this client's tokens. Auto-derived from the key.
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
              disabled={!newClientName.trim() || !newClientKey.trim() || creatingClient}
            >
              {creatingClient && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
