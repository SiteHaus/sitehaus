"use client";

import { getApi } from "@site-haus/stores/api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@site-haus/ui/components/base/dialog";
import { Input } from "@site-haus/ui/components/base/input";
import { Label } from "@site-haus/ui/components/base/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@site-haus/ui/components/base/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Role = { id: string; name: string };

interface InviteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectClientId: string;
  clientName: string;
  onDone: () => void;
}

export function InviteClientDialog({
  open,
  onOpenChange,
  projectClientId,
  clientName,
  onDone,
}: InviteClientDialogProps) {
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingRoles(true);
    const prev = useAuthStore.getState().managedClientId;
    useAuthStore.getState().setManagedClientId(projectClientId);
    getApi()
      .roles.list()
      .then((res) => {
        if (res.status === 200) setRoles(res.body.roles);
      })
      .finally(() => {
        useAuthStore.getState().setManagedClientId(prev);
        setLoadingRoles(false);
      });
  }, [open, projectClientId]);

  const handleSend = async () => {
    if (!email || !selectedRoleId) return;
    setLoading(true);
    const prev = useAuthStore.getState().managedClientId;
    useAuthStore.getState().setManagedClientId(projectClientId);
    try {
      const res = await getApi().invites.create({
        body: { email, roleIds: [selectedRoleId] },
      });
      if (res.status === 201) {
        toast.success(`Invite sent to ${email}`);
        onDone();
      } else if (res.status === 409) {
        toast.error("This email has already been invited.");
      } else {
        toast.error("Failed to send invite.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      useAuthStore.getState().setManagedClientId(prev);
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite {clientName}</DialogTitle>
          <DialogDescription>
            Your project is ready. Give {clientName} access by inviting their
            contact.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="contact@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select
              value={selectedRoleId}
              onValueChange={setSelectedRoleId}
              disabled={loadingRoles}
            >
              <SelectTrigger id="invite-role">
                <SelectValue
                  placeholder={
                    loadingRoles ? "Loading roles..." : "Select a role"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleSend}
            disabled={loading || !email || !selectedRoleId}
          >
            {loading ? "Sending..." : "Send Invite"}
          </Button>
          <button
            type="button"
            className="text-muted-foreground text-sm underline-offset-4 hover:underline"
            onClick={handleSkip}
          >
            Skip for now
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
