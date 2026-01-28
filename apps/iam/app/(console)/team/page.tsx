"use client";

import { ConsolePageWrapper } from "@/app/components/console-page-wrapper";
import { PageHeader } from "@/app/components/page-header";
import { PermissionDenied } from "@/app/components/permission-denied";
import { SubmitButton } from "@/app/components/submit-button";
import { useApi } from "@/lib/typed-api";
import { useClientContext } from "@/lib/use-client-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClientMember } from "@site-haus/contracts";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { Badge } from "@site-haus/ui/components/base/badge";
import { Button } from "@site-haus/ui/components/base/button";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@site-haus/ui/components/base/form";
import { Input } from "@site-haus/ui/components/base/input";
import { Label } from "@site-haus/ui/components/base/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@site-haus/ui/components/base/tabs";
import { DataTable } from "@site-haus/ui/components/shared/data-table/data-table";
import { createInviteSchema } from "@site-haus/validation/forms/invite";
import { formatDistanceToNow } from "date-fns";
import { MailPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type ClientMemberKey = Extract<keyof ClientMember, string>;

const DEFAULT_MEMBER_COLUMNS: ClientMemberKey[] = [
  "email",
  "firstName",
  "lastName",
  "roles",
  "isVerified",
  "status",
];

interface Invite {
  id: string;
  clientId: string;
  email: string;
  roleIds: string[];
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface InviteDisplay {
  [key: string]: unknown;
  id: string;
  email: string;
  status: string;
  sent: string;
  expires: string;
}

type InviteDisplayKey = Extract<keyof InviteDisplay, string>;

const DEFAULT_INVITE_COLUMNS: InviteDisplayKey[] = [
  "email",
  "status",
  "sent",
  "expires",
];

type InviteFormValues = z.infer<typeof createInviteSchema>;

interface Role {
  id: string;
  name: string;
  key: string;
  description: string | null;
  isDefault: boolean;
}

function getInviteStatus(invite: Invite): string {
  if (invite.acceptedAt) return "Accepted";
  if (invite.revokedAt) return "Cancelled";
  if (new Date(invite.expiresAt) < new Date()) return "Expired";
  return "Pending";
}

export default function TeamPage() {
  return (
    <ConsolePageWrapper maxWidth="4xl" className="max-w-none">
      <TeamContent />
    </ConsolePageWrapper>
  );
}

function TeamContent() {
  const api = useApi();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { selectedClient } = useClientContext();

  const [members, setMembers] = useState<ClientMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editMemberDialogOpen, setEditMemberDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ClientMember | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    const res = await api.clients.meMembers();
    if (res.status === 200) {
      setMembers(res.body.members);
      setPermissionDenied(false);
    } else if (res.status === 403) {
      setPermissionDenied(true);
    } else {
      setError("Failed to load team members.");
    }
    setLoadingMembers(false);
  }, [api]);

  const fetchInvites = useCallback(async () => {
    setLoadingInvites(true);
    try {
      const res = await api.invites.list();
      if (res.status === 200) {
        const invitesData = res.body.invites ?? res.body ?? [];
        setInvites(Array.isArray(invitesData) ? invitesData : []);
      }
    } catch (err) {
      console.error("Failed to fetch invites:", err);
    }
    setLoadingInvites(false);
  }, [api]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await api.roles.list();
      if (res.status === 200) {
        setRoles(res.body.roles);
      }
    } catch (err) {
      console.error("Failed to fetch roles:", err);
    }
  }, [api]);

  useEffect(() => {
    if (!accessToken) return;
    fetchMembers();
    fetchInvites();
    fetchRoles();
  }, [accessToken, fetchMembers, fetchInvites, fetchRoles]);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(createInviteSchema),
    defaultValues: {
      email: "",
      roleIds: [],
    },
  });

  const onSubmitInvite = async (values: InviteFormValues) => {
    const res = await api.invites.create({ body: values });

    if (res.status === 201) {
      toast.success(`Invite sent to ${values.email}`);
      setInviteDialogOpen(false);
      form.reset();
      fetchInvites();
    } else if (res.status === 409) {
      toast.error("An invite for this email already exists.");
    } else {
      toast.error("Failed to send invite.");
    }
  };

  const pendingInvites = useMemo(
    () => invites.filter((inv) => !inv.acceptedAt && !inv.revokedAt),
    [invites]
  );

  const handleDeleteInvite = async (invite: InviteDisplay) => {
    const res = await api.invites.cancel({ params: { id: invite.id } });
    if (res.status === 204) {
      toast.success("Invite cancelled");
      fetchInvites();
    } else {
      toast.error("Failed to cancel invite");
    }
  };

  const handleEditMember = (member: ClientMember) => {
    setEditingMember(member);
    setEditMemberDialogOpen(true);
  };

  const handleToggleRole = async (
    userId: string,
    roleId: string,
    hasRole: boolean
  ) => {
    if (hasRole) {
      const res = await api.roles.unassignRole({ params: { userId, roleId } });
      if (res.status === 204) {
        toast.success("Role removed");
        fetchMembers();
      } else {
        toast.error("Failed to remove role");
      }
    } else {
      const res = await api.roles.assignRole({ params: { userId, roleId } });
      if (res.status === 204) {
        toast.success("Role assigned");
        fetchMembers();
      } else {
        toast.error("Failed to assign role");
      }
    }
  };

  useEffect(() => {
    if (editingMember) {
      const updated = members.find((m) => m.id === editingMember.id);
      if (updated) {
        setEditingMember(updated);
      }
    }
  }, [members, editingMember]);

  const invitesForDisplay = useMemo<InviteDisplay[]>(
    () =>
      invites.map((inv) => ({
        id: inv.id,
        email: inv.email,
        status: getInviteStatus(inv),
        sent: formatDistanceToNow(new Date(inv.createdAt), { addSuffix: true }),
        expires: formatDistanceToNow(new Date(inv.expiresAt), {
          addSuffix: true,
        }),
      })),
    [invites]
  );

  if (permissionDenied) {
    return (
      <PermissionDenied resource="the team" clientName={selectedClient?.name} />
    );
  }

  return (
    <>
      <PageHeader
        title="Your Team"
        description="Manage users, invites, roles, and permissions for this client."
        action={
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <MailPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a new team member</DialogTitle>
                <DialogDescription>
                  Send an invitation email to add someone to your team.
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmitInvite)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email address</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="colleague@example.com"
                            type="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {roles.length > 0 && (
                    <FormField
                      control={form.control}
                      name="roleIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Roles (optional)</FormLabel>
                          <div className="space-y-2 rounded-md border p-3">
                            {roles.map((role) => (
                              <div
                                key={role.id}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={`role-${role.id}`}
                                  checked={field.value?.includes(role.id)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value ?? [];
                                    if (checked) {
                                      field.onChange([...current, role.id]);
                                    } else {
                                      field.onChange(
                                        current.filter(
                                          (id: string) => id !== role.id
                                        )
                                      );
                                    }
                                  }}
                                />
                                <Label
                                  htmlFor={`role-${role.id}`}
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  {role.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setInviteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <SubmitButton
                      isSubmitting={form.formState.isSubmitting}
                      label="Send Invite"
                      loadingLabel="Sending..."
                    />
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      <Dialog
        open={editMemberDialogOpen}
        onOpenChange={setEditMemberDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member Roles</DialogTitle>
            <DialogDescription>
              {editingMember?.email} - Toggle roles for this member.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 rounded-md border p-3">
            {roles.map((role) => {
              const hasRole =
                editingMember?.roles.some(
                  (r: { id: string }) => r.id === role.id
                ) ?? false;
              return (
                <div key={role.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`edit-role-${role.id}`}
                    checked={hasRole}
                    onCheckedChange={() => {
                      if (editingMember) {
                        handleToggleRole(
                          editingMember.id,
                          role.id,
                          hasRole
                        );
                      }
                    }}
                  />
                  <Label
                    htmlFor={`edit-role-${role.id}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {role.name}
                  </Label>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditMemberDialogOpen(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">
            <span>Members</span>
            {members.length > 0 && <Badge>{members.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="invites">
            <span>Invites</span>
            {pendingInvites.length > 0 && (
              <Badge>{pendingInvites.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
          {loadingMembers && (
            <p className="text-sm text-muted-foreground">
              Loading team members...
            </p>
          )}

          {!loadingMembers && error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {!loadingMembers && !error && (
            <DataTable<ClientMember>
              data={members}
              defaultColumns={DEFAULT_MEMBER_COLUMNS}
              actions={{ onEdit: handleEditMember }}
            />
          )}
        </TabsContent>

        <TabsContent value="invites" className="mt-4">
          {loadingInvites && (
            <p className="text-sm text-muted-foreground">
              Loading invites...
            </p>
          )}

          {!loadingInvites && invites.length === 0 && (
            <div className="rounded-md border p-8 text-center bg-card">
              <p className="text-muted-foreground">
                No invites yet. Click &quot;Invite Member&quot; to send one.
              </p>
            </div>
          )}

          {!loadingInvites && invites.length > 0 && (
            <DataTable<InviteDisplay>
              data={invitesForDisplay}
              defaultColumns={DEFAULT_INVITE_COLUMNS}
              actions={{ onDelete: handleDeleteInvite }}
            />
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
