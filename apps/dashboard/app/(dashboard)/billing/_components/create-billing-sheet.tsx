"use client";

import type { MeClient } from "@site-haus/contracts";
import { getApi } from "@site-haus/stores/api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { Button } from "@site-haus/ui/components/base/button";
import { Input } from "@site-haus/ui/components/base/input";
import { Label } from "@site-haus/ui/components/base/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@site-haus/ui/components/base/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@site-haus/ui/components/base/sheet";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@site-haus/ui/components/base/tabs";
import { Textarea } from "@site-haus/ui/components/base/textarea";
import { useEffect, useState } from "react";

interface Project {
  id: string;
  name: string;
  monthlyRateCents: number | null;
  depositAmountCents: number | null;
}

interface CreateBillingSheetProps {
  open: boolean;
  onClose: () => void;
  onCreateSubscription: (data: {
    clientId: string;
    projectId: string;
    amountCents: number;
    intervalMonths: number;
  }) => Promise<boolean>;
  onCreateOneTime: (data: {
    clientId: string;
    projectId: string;
    amountCents: number;
    description?: string;
  }) => Promise<boolean>;
}

export function CreateBillingSheet({
  open,
  onClose,
  onCreateSubscription,
  onCreateOneTime,
}: CreateBillingSheetProps) {
  const allClients = useAuthStore((s) => s.clients);
  const clients = allClients.filter((c) => !c.firstParty && !c.hidden);

  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Subscription fields
  const [subAmount, setSubAmount] = useState("");
  const [subInterval, setSubInterval] = useState("1");

  // One-time fields
  const [otAmount, setOtAmount] = useState("");
  const [otDescription, setOtDescription] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setClientId("");
      setProjectId("");
      setProjects([]);
      setSubAmount("");
      setSubInterval("1");
      setOtAmount("");
      setOtDescription("");
    }
  }, [open]);

  useEffect(() => {
    if (!clientId) {
      setProjects([]);
      setProjectId("");
      return;
    }
    setLoadingProjects(true);
    setProjectId("");
    getApi()
      .projects.list({ query: { clientId, limit: 100 } })
      .then((res) => {
        if (res.status === 200) {
          setProjects(
            res.body.projects.map((p) => ({
              id: p.id,
              name: p.name,
              monthlyRateCents: p.monthlyRateCents,
              depositAmountCents: p.depositAmountCents,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProjects(false));
  }, [clientId]);

  // Pre-fill amounts from project rates when a project is selected
  useEffect(() => {
    if (!projectId) return;
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    if (project.monthlyRateCents) {
      setSubAmount((project.monthlyRateCents / 100).toFixed(2));
    }
    if (project.depositAmountCents) {
      setOtAmount((project.depositAmountCents / 100).toFixed(2));
    }
  }, [projectId, projects]);

  const handleSubscription = async () => {
    const cents = Math.round(parseFloat(subAmount) * 100);
    if (!clientId || !projectId || isNaN(cents) || cents <= 0) return;
    setSaving(true);
    const ok = await onCreateSubscription({
      clientId,
      projectId,
      amountCents: cents,
      intervalMonths: parseInt(subInterval) || 1,
    });
    setSaving(false);
    if (ok) onClose();
  };

  const handleOneTime = async () => {
    const cents = Math.round(parseFloat(otAmount) * 100);
    if (!clientId || !projectId || isNaN(cents) || cents <= 0) return;
    setSaving(true);
    const ok = await onCreateOneTime({
      clientId,
      projectId,
      amountCents: cents,
      ...(otDescription.trim() ? { description: otDescription.trim() } : {}),
    });
    setSaving(false);
    if (ok) onClose();
  };

  const baseValid = !!clientId && !!projectId;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Create Billing</SheetTitle>
          <SheetDescription>
            Set up a recurring subscription or send a one-time invoice.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
          {/* Client + Project selectors shared by both tabs */}
          <div className="space-y-1.5">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a client…" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select
              value={projectId}
              onValueChange={setProjectId}
              disabled={!clientId || loadingProjects}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    !clientId
                      ? "Select a client first"
                      : loadingProjects
                      ? "Loading…"
                      : projects.length === 0
                      ? "No projects"
                      : "Select a project…"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="subscription">
            <TabsList className="w-full">
              <TabsTrigger value="subscription" className="flex-1">
                Recurring
              </TabsTrigger>
              <TabsTrigger value="onetime" className="flex-1">
                One-Time
              </TabsTrigger>
            </TabsList>

            <TabsContent value="subscription" className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="sub-amount">Monthly Amount (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    $
                  </span>
                  <Input
                    id="sub-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-7"
                    value={subAmount}
                    onChange={(e) => setSubAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sub-interval">Billing Interval</Label>
                <Select value={subInterval} onValueChange={setSubInterval}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Monthly</SelectItem>
                    <SelectItem value="3">Every 3 Months</SelectItem>
                    <SelectItem value="6">Every 6 Months</SelectItem>
                    <SelectItem value="12">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <SheetFooter className="px-0">
                <Button variant="outline" onClick={onClose} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubscription}
                  disabled={
                    saving ||
                    !baseValid ||
                    !subAmount ||
                    parseFloat(subAmount) <= 0
                  }
                >
                  {saving && <Spinner className="size-4 mr-2" />}
                  Create Subscription
                </Button>
              </SheetFooter>
            </TabsContent>

            <TabsContent value="onetime" className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="ot-amount">Amount (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    $
                  </span>
                  <Input
                    id="ot-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-7"
                    value={otAmount}
                    onChange={(e) => setOtAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ot-desc">Description</Label>
                <Textarea
                  id="ot-desc"
                  placeholder="Optional — defaults to project name"
                  rows={2}
                  className="resize-none"
                  value={otDescription}
                  onChange={(e) => setOtDescription(e.target.value)}
                />
              </div>

              <SheetFooter className="px-0">
                <Button variant="outline" onClick={onClose} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  onClick={handleOneTime}
                  disabled={
                    saving ||
                    !baseValid ||
                    !otAmount ||
                    parseFloat(otAmount) <= 0
                  }
                >
                  {saving && <Spinner className="size-4 mr-2" />}
                  Send Invoice
                </Button>
              </SheetFooter>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
