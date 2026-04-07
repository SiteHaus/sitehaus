"use client";

import { ConsolePageWrapper } from "@/app/components/console-page-wrapper";
import { PageHeader } from "@/app/components/page-header";
import { PermissionDenied } from "@/app/components/permission-denied";
import { EmptyState, LoadingState } from "@/app/components/states";
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
import { Checkbox } from "@site-haus/ui/components/base/checkbox";
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
import { Label } from "@site-haus/ui/components/base/label";
import { Separator } from "@site-haus/ui/components/base/separator";
import { Switch } from "@site-haus/ui/components/base/switch";
import { Textarea } from "@site-haus/ui/components/base/textarea";
import { ALL_PERMISSIONS, PERM } from "@site-haus/validation/core/perms";
import { createRoleSchema } from "@site-haus/validation/forms/role";
import { ChevronDown, ChevronRight, Pencil, Plus, Shield, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface Role {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
}

type CreateRoleInput = z.infer<typeof createRoleSchema>;

export default function RolesPage() {
  return (
    <ConsolePageWrapper>
      <RolesContent />
    </ConsolePageWrapper>
  );
}

function RolesContent() {
  const api = useApi();
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasPerm = useAuthStore((s) => s.hasPerm);
  const { selectedClient } = useClientContext();

  const [roles, setRoles] = useState<Role[]>([]);
  const [rolePerms, setRolePerms] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editPermsRole, setEditPermsRole] = useState<Role | null>(null);

  const canManage = hasPerm("roles:manage");

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.roles.list();
      if (res.status === 200) {
        setRoles(res.body.roles);
        setPermissionDenied(false);

        const permsMap: Record<string, string[]> = {};
        await Promise.all(
          res.body.roles.map(async (role) => {
            const permsRes = await api.roles.getPerms({
              params: { roleId: role.id },
            });
            if (permsRes.status === 200) {
              permsMap[role.id] = permsRes.body.perms;
            }
          }),
        );
        setRolePerms(permsMap);
      } else if (res.status === 403) {
        setPermissionDenied(true);
      }
    } catch (err) {
      console.error("Failed to fetch roles:", err);
    }
    setLoading(false);
  }, [api]);

  useEffect(() => {
    if (accessToken) {
      fetchRoles();
    }
  }, [accessToken, fetchRoles]);

  const handleDeleteRole = async (role: Role) => {
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;

    const res = await api.roles.remove({ params: { roleId: role.id } });
    if (res.status === 204) {
      toast.success("Role deleted");
      fetchRoles();
    } else {
      toast.error("Failed to delete role");
    }
  };

  if (permissionDenied) {
    return <PermissionDenied resource="roles" clientName={selectedClient?.name} />;
  }

  return (
    <>
      <PageHeader
        title="Roles"
        description="Manage roles and permissions for this client."
        action={
          canManage && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Role
                </Button>
              </DialogTrigger>
              <DialogContent>
                <CreateRoleDialog
                  onSuccess={() => {
                    setCreateDialogOpen(false);
                    fetchRoles();
                  }}
                  onCancel={() => setCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )
        }
      />

      {loading && <LoadingState />}

      {!loading && roles.length === 0 && (
        <Card>
          <CardContent>
            <EmptyState
              icon={Shield}
              title="No roles defined yet."
              description={canManage ? "Create your first role to get started." : undefined}
            />
          </CardContent>
        </Card>
      )}

      {!loading && roles.length > 0 && (
        <div className="space-y-4">
          {roles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              perms={rolePerms[role.id] ?? []}
              canManage={canManage}
              onEdit={() => setEditingRole(role)}
              onEditPerms={() => setEditPermsRole(role)}
              onDelete={() => handleDeleteRole(role)}
            />
          ))}
        </div>
      )}

      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent>
          {editingRole && (
            <EditRoleDialog
              role={editingRole}
              onSuccess={() => {
                setEditingRole(null);
                fetchRoles();
              }}
              onCancel={() => setEditingRole(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editPermsRole} onOpenChange={(open) => !open && setEditPermsRole(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {editPermsRole && (
            <EditPermissionsDialog
              role={editPermsRole}
              currentPerms={rolePerms[editPermsRole.id] ?? []}
              onSuccess={() => {
                setEditPermsRole(null);
                fetchRoles();
              }}
              onCancel={() => setEditPermsRole(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function RoleCard({
  role,
  perms,
  canManage,
  onEdit,
  onEditPerms,
  onDelete,
}: {
  role: Role;
  perms: string[];
  canManage: boolean;
  onEdit: () => void;
  onEditPerms: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{role.name}</CardTitle>
              {role.isDefault && (
                <Badge variant="secondary" className="text-xs">
                  Default
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{role.key}</code>
              {role.description && <span className="ml-2">{role.description}</span>}
            </CardDescription>
          </div>

          {canManage && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                disabled={role.isDefault}
                title={role.isDefault ? "Cannot delete default role" : "Delete"}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span>
            {perms.length} permission{perms.length !== 1 && "s"}
          </span>
        </button>

        {expanded && (
          <div className="mt-3 space-y-2">
            {perms.length === 0 ? (
              <p className="text-sm text-muted-foreground">No permissions assigned.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {perms.map((perm) => (
                  <Badge key={perm} variant="outline" className="text-xs">
                    {perm}
                  </Badge>
                ))}
              </div>
            )}

            {canManage && (
              <Button variant="outline" size="sm" className="mt-2" onClick={onEditPerms}>
                Edit Permissions
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreateRoleDialog({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const api = useApi();
  const form = useForm<CreateRoleInput>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      key: "",
      name: "",
      description: "",
      isDefault: false,
    },
  });

  const onSubmit = async (values: CreateRoleInput) => {
    const res = await api.roles.create({ body: values });
    if (res.status === 201) {
      toast.success("Role created");
      form.reset();
      onSuccess();
    } else if (res.status === 409) {
      toast.error("A role with this key already exists");
    } else {
      toast.error("Failed to create role");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create New Role</DialogTitle>
        <DialogDescription>Create a new role to assign permissions to users.</DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Editor" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="key"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Key</FormLabel>
                <FormControl>
                  <Input placeholder="editor" {...field} />
                </FormControl>
                <FormDescription>Unique identifier (lowercase, no spaces)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Can edit content but not manage users" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isDefault"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <FormLabel className="text-base">Default Role</FormLabel>
                  <FormDescription>Automatically assigned to new users</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
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
              label="Create Role"
              loadingLabel="Creating..."
            />
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}

function EditRoleDialog({
  role,
  onSuccess,
  onCancel,
}: {
  role: Role;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const api = useApi();
  const form = useForm({
    defaultValues: {
      name: role.name,
      description: role.description ?? "",
      isDefault: role.isDefault,
    },
  });

  const onSubmit = async (values: { name: string; description: string; isDefault: boolean }) => {
    const res = await api.roles.update({
      params: { roleId: role.id },
      body: values,
    });
    if (res.status === 200) {
      toast.success("Role updated");
      onSuccess();
    } else {
      toast.error("Failed to update role");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Role</DialogTitle>
        <DialogDescription>Update the role details. The key cannot be changed.</DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">Key</Label>
            <p className="font-mono text-sm">{role.key}</p>
          </div>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
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
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isDefault"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <FormLabel className="text-base">Default Role</FormLabel>
                  <FormDescription>Automatically assigned to new users</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
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

function EditPermissionsDialog({
  role,
  currentPerms,
  onSuccess,
  onCancel,
}: {
  role: Role;
  currentPerms: string[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const api = useApi();
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set(currentPerms));
  const [saving, setSaving] = useState(false);

  const togglePerm = (perm: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) {
        next.delete(perm);
      } else {
        next.add(perm);
      }
      return next;
    });
  };

  const toggleResource = (resource: string, perms: readonly string[]) => {
    const resourcePerms = perms.map((p) => `${resource}:${p}`);
    const allSelected = resourcePerms.every((p) => selectedPerms.has(p));

    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        resourcePerms.forEach((p) => next.delete(p));
      } else {
        resourcePerms.forEach((p) => next.add(p));
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await api.roles.replacePerms({
      params: { roleId: role.id },
      body: { perms: Array.from(selectedPerms) },
    });
    setSaving(false);

    if (res.status === 204) {
      toast.success("Permissions updated");
      onSuccess();
    } else {
      toast.error("Failed to update permissions");
    }
  };

  const selectAll = () => setSelectedPerms(new Set(ALL_PERMISSIONS));
  const selectNone = () => setSelectedPerms(new Set());

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Permissions for {role.name}</DialogTitle>
        <DialogDescription>Select which permissions this role should have.</DialogDescription>
      </DialogHeader>

      <div className="flex gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={selectAll}>
          Select All
        </Button>
        <Button variant="outline" size="sm" onClick={selectNone}>
          Clear All
        </Button>
      </div>

      <div className="space-y-4">
        {(Object.entries(PERM) as [string, readonly string[]][]).map(([resource, actions]) => {
          const resourcePerms = actions.map((a) => `${resource}:${a}`);
          const selectedCount = resourcePerms.filter((p) => selectedPerms.has(p)).length;
          const allSelected = selectedCount === resourcePerms.length;
          const someSelected = selectedCount > 0 && !allSelected;

          return (
            <div key={resource} className="rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) {
                      (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate =
                        someSelected;
                    }
                  }}
                  onCheckedChange={() => toggleResource(resource, actions)}
                />
                <Label className="font-medium capitalize cursor-pointer">{resource}</Label>
                <span className="text-xs text-muted-foreground">
                  ({selectedCount}/{actions.length})
                </span>
              </div>

              <Separator className="my-2" />

              <div className="grid grid-cols-2 gap-2">
                {actions.map((action) => {
                  const perm = `${resource}:${action}`;
                  return (
                    <div key={perm} className="flex items-center gap-2">
                      <Checkbox
                        id={perm}
                        checked={selectedPerms.has(perm)}
                        onCheckedChange={() => togglePerm(perm)}
                      />
                      <Label htmlFor={perm} className="text-sm font-normal cursor-pointer">
                        {action}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <DialogFooter className="mt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <SubmitButton
          isSubmitting={saving}
          label="Save Permissions"
          loadingLabel="Saving..."
          type="button"
          onClick={handleSave}
        />
      </DialogFooter>
    </>
  );
}
