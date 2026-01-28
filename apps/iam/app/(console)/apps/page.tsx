"use client";

import { ConsolePageWrapper } from "@/app/components/console-page-wrapper";
import { CopyButton } from "@/app/components/copy-button";
import { LoadingState, EmptyState } from "@/app/components/states";
import { PageHeader } from "@/app/components/page-header";
import { PermissionDenied } from "@/app/components/permission-denied";
import { SubmitButton } from "@/app/components/submit-button";
import { useApi } from "@/lib/typed-api";
import { useClientContext } from "@/lib/use-client-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { Badge } from "@site-haus/ui/components/base/badge";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@site-haus/ui/components/base/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@site-haus/ui/components/base/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@site-haus/ui/components/base/form";
import { Input } from "@site-haus/ui/components/base/input";
import { Separator } from "@site-haus/ui/components/base/separator";
import { Switch } from "@site-haus/ui/components/base/switch";
import { Textarea } from "@site-haus/ui/components/base/textarea";
import {
  addRedirectUriSchema,
  updateClientSchema,
} from "@site-haus/validation/forms/client";
import {
  AppWindow,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface ClientDetail {
  id: string;
  key: string;
  name: string;
  type: "public" | "confidential";
  firstParty: boolean;
  audience: string;
  allowedScopes: string | null;
  requiresConsent: boolean;
  hidden: boolean;
  createdAt: string | null;
}

interface RedirectUri {
  id: string;
  uri: string;
}

type UpdateClientInput = z.infer<typeof updateClientSchema>;
type AddRedirectUriInput = z.infer<typeof addRedirectUriSchema>;

export default function AppsPage() {
  return (
    <ConsolePageWrapper>
      <AppsContent />
    </ConsolePageWrapper>
  );
}

function AppsContent() {
  const api = useApi();
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasPerm = useAuthStore((s) => s.hasPerm);
  const { selectedClient } = useClientContext();

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [redirectUris, setRedirectUris] = useState<RedirectUri[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addUriDialogOpen, setAddUriDialogOpen] = useState(false);

  const canRead = hasPerm("clients:read");
  const canManage = hasPerm("clients:manage");

  const fetchClient = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.clients.getCurrent();
      if (res.status === 200) {
        setClient(res.body.client);
        setPermissionDenied(false);
      } else if (res.status === 400) {
        setPermissionDenied(true);
      }
    } catch (err) {
      console.error("Failed to fetch client:", err);
      setPermissionDenied(true);
    }
    setLoading(false);
  }, [api]);

  const fetchRedirectUris = useCallback(async () => {
    try {
      const res = await api.clients.listRedirectUris();
      if (res.status === 200) {
        setRedirectUris(res.body.redirectUris);
      }
    } catch (err) {
      console.error("Failed to fetch redirect URIs:", err);
    }
  }, [api]);

  useEffect(() => {
    if (accessToken && canRead) {
      fetchClient();
      fetchRedirectUris();
    } else if (accessToken && !canRead) {
      setLoading(false);
      setPermissionDenied(true);
    }
  }, [accessToken, canRead, fetchClient, fetchRedirectUris]);

  const handleDeleteUri = async (uri: RedirectUri) => {
    if (!confirm(`Remove redirect URI "${uri.uri}"?`)) return;

    const res = await api.clients.removeRedirectUri({
      params: { uriId: uri.id },
    });
    if (res.status === 204) {
      toast.success("Redirect URI removed");
      fetchRedirectUris();
    } else {
      toast.error("Failed to remove redirect URI");
    }
  };

  if (permissionDenied) {
    return (
      <PermissionDenied
        resource="app settings"
        clientName={selectedClient?.name}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="App Settings"
        description="Manage OAuth client configuration and redirect URIs."
      />

      {loading && <LoadingState />}

      {!loading && client && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <AppWindow className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{client.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {client.key}
                      </code>
                      <Badge
                        variant={
                          client.type === "confidential"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {client.type}
                      </Badge>
                      {client.firstParty && (
                        <Badge variant="outline">First Party</Badge>
                      )}
                    </CardDescription>
                  </div>
                </div>

                {canManage && (
                  <Dialog
                    open={editDialogOpen}
                    onOpenChange={setEditDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <EditClientDialog
                        client={client}
                        onSuccess={() => {
                          setEditDialogOpen(false);
                          fetchClient();
                        }}
                        onCancel={() => setEditDialogOpen(false)}
                      />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Client ID</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono">{client.id}</code>
                    <CopyButton value={client.id} label="Client ID" />
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Audience</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono">{client.audience}</code>
                    <CopyButton value={client.audience} label="Audience" />
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Allowed Scopes
                  </p>
                  <p className="text-sm">
                    {client.allowedScopes || (
                      <span className="text-muted-foreground italic">
                        None specified
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Requires Consent
                  </p>
                  <p className="text-sm">
                    {client.requiresConsent ? "Yes" : "No"}
                  </p>
                </div>
              </div>

              {client.createdAt && (
                <>
                  <Separator />
                  <p className="text-xs text-muted-foreground">
                    Created{" "}
                    {new Date(client.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Redirect URIs</CardTitle>
                  <CardDescription>
                    Allowed callback URLs for OAuth authentication flows.
                  </CardDescription>
                </div>

                {canManage && (
                  <Dialog
                    open={addUriDialogOpen}
                    onOpenChange={setAddUriDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add URI
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <AddRedirectUriDialog
                        onSuccess={() => {
                          setAddUriDialogOpen(false);
                          fetchRedirectUris();
                        }}
                        onCancel={() => setAddUriDialogOpen(false)}
                      />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {redirectUris.length === 0 ? (
                <EmptyState
                  icon={ExternalLink}
                  title="No redirect URIs configured."
                  description={
                    canManage
                      ? "Add a redirect URI to enable OAuth flows."
                      : undefined
                  }
                  className="py-8"
                />
              ) : (
                <div className="space-y-2">
                  {redirectUris.map((uri) => (
                    <div
                      key={uri.id}
                      className="flex items-center justify-between rounded-lg border px-4 py-3"
                    >
                      <code className="text-sm font-mono break-all">
                        {uri.uri}
                      </code>
                      <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                        <CopyButton value={uri.uri} label="URI" size="default" />
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteUri(uri)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

function EditClientDialog({
  client,
  onSuccess,
  onCancel,
}: {
  client: ClientDetail;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const api = useApi();
  const form = useForm<UpdateClientInput>({
    resolver: zodResolver(updateClientSchema),
    defaultValues: {
      name: client.name,
      allowedScopes: client.allowedScopes ?? "",
      requiresConsent: client.requiresConsent,
    },
  });

  const onSubmit = async (values: UpdateClientInput) => {
    const changes: Partial<UpdateClientInput> = {};
    if (values.name !== client.name) changes.name = values.name;
    if ((values.allowedScopes ?? "") !== (client.allowedScopes ?? ""))
      changes.allowedScopes = values.allowedScopes;
    if (values.requiresConsent !== client.requiresConsent)
      changes.requiresConsent = values.requiresConsent;

    if (Object.keys(changes).length === 0) {
      toast.info("No changes to save");
      return;
    }

    const res = await api.clients.updateCurrent({ body: changes });
    if (res.status === 200) {
      toast.success("App settings updated");
      onSuccess();
    } else {
      toast.error("Failed to update settings");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit App Settings</DialogTitle>
        <DialogDescription>
          Update your OAuth client configuration. Some fields cannot be changed
          after creation.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>App Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  The display name shown to users during OAuth consent.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="allowedScopes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Allowed Scopes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="openid profile email"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormDescription>
                  Space-separated list of OAuth scopes this client can request.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="requiresConsent"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <FormLabel className="text-base">Require Consent</FormLabel>
                  <FormDescription>
                    Show consent screen to users during OAuth flow.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <SubmitButton
              isSubmitting={form.formState.isSubmitting}
              label="Save Changes"
              loadingLabel="Saving..."
            />
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}

function AddRedirectUriDialog({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const api = useApi();
  const form = useForm<AddRedirectUriInput>({
    resolver: zodResolver(addRedirectUriSchema),
    defaultValues: {
      uri: "",
    },
  });

  const onSubmit = async (values: AddRedirectUriInput) => {
    const res = await api.clients.addRedirectUri({ body: values });
    if (res.status === 201) {
      toast.success("Redirect URI added");
      form.reset();
      onSuccess();
    } else if (res.status === 409) {
      toast.error("This redirect URI already exists");
    } else {
      toast.error("Failed to add redirect URI");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Redirect URI</DialogTitle>
        <DialogDescription>
          Add an allowed callback URL for OAuth authentication.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="uri"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Redirect URI</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://example.com/callback"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Must be a valid URL. For development, localhost URLs are
                  allowed.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <SubmitButton
              isSubmitting={form.formState.isSubmitting}
              label="Add URI"
              loadingLabel="Adding..."
            />
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
