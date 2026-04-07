"use client";

import { useBillingProject } from "@/hooks/use-billing";
import { BillingRecordCard } from "@/app/(dashboard)/billing/_components/billing-record-card";
import { getApi } from "@site-haus/stores/api";
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
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, ExternalLink, Plus, Receipt } from "lucide-react";
import { useEffect, useState } from "react";

interface ProjectBillingSectionProps {
  projectId: string;
  clientId: string;
  monthlyRateCents: number | null;
  depositAmountCents: number | null;
  canManage: boolean;
}

export function ProjectBillingSection({
  projectId,
  clientId,
  monthlyRateCents,
  depositAmountCents,
  canManage,
}: ProjectBillingSectionProps) {
  const { records, loading, createSubscription, createOneTime } = useBillingProject(
    projectId,
    clientId,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: queryKeys.clients.members(),
    queryFn: async () => {
      const res = await getApi().clients.meMembers();
      if (res.status !== 200) throw new Error("Failed to load members");
      return res.body.members;
    },
    enabled: sheetOpen,
  });

  const openPortal = async () => {
    const res = await getApi().billing.getPortalUrl();
    if (res.status === 200) window.open(res.body.url, "_blank");
  };

  // Subscription fields
  const [subAmount, setSubAmount] = useState("");
  const [subInterval, setSubInterval] = useState("1");
  const [subEmail, setSubEmail] = useState("");

  // One-time fields
  const [otAmount, setOtAmount] = useState("");
  const [otDescription, setOtDescription] = useState("");
  const [otEmail, setOtEmail] = useState("");

  // Pre-fill amounts from project rates when sheet opens
  useEffect(() => {
    if (!sheetOpen) {
      setSubAmount(monthlyRateCents ? (monthlyRateCents / 100).toFixed(2) : "");
      setSubInterval("1");
      setSubEmail("");
      setOtAmount(depositAmountCents ? (depositAmountCents / 100).toFixed(2) : "");
      setOtDescription("");
      setOtEmail("");
    }
  }, [sheetOpen, monthlyRateCents, depositAmountCents]);

  const handleSubscription = async () => {
    const cents = Math.round(parseFloat(subAmount) * 100);
    if (isNaN(cents) || cents <= 0) return;
    setSaving(true);
    const ok = await createSubscription({
      amountCents: cents,
      intervalMonths: parseInt(subInterval) || 1,
      ...(subEmail.trim() ? { billingEmail: subEmail.trim() } : {}),
    });
    setSaving(false);
    if (ok) setSheetOpen(false);
  };

  const handleOneTime = async () => {
    const cents = Math.round(parseFloat(otAmount) * 100);
    if (isNaN(cents) || cents <= 0) return;
    setSaving(true);
    const ok = await createOneTime({
      amountCents: cents,
      ...(otDescription.trim() ? { description: otDescription.trim() } : {}),
      ...(otEmail.trim() ? { billingEmail: otEmail.trim() } : {}),
    });
    setSaving(false);
    if (ok) setSheetOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Billing</h2>
        </div>
        <div className="flex items-center gap-2">
          {!canManage && (
            <Button size="sm" variant="ghost" onClick={openPortal}>
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              Manage in Stripe
            </Button>
          )}
          {canManage && (
            <Button size="sm" variant="outline" onClick={() => setSheetOpen(true)}>
              <Plus className="mr-2 h-3.5 w-3.5" />
              Add Billing
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner className="size-5 text-primary" />
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border">
          <Receipt className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">No billing records</p>
          {canManage && (
            <p className="text-xs text-muted-foreground mt-1">
              Add a subscription or one-time invoice above.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <BillingRecordCard key={record.id} record={record} onOpenPortal={openPortal} />
          ))}
        </div>
      )}

      <Sheet
        open={sheetOpen}
        onOpenChange={(o) => {
          if (!o) setSheetOpen(false);
        }}
      >
        <SheetContent className="flex flex-col">
          <SheetHeader>
            <SheetTitle>Add Billing</SheetTitle>
            <SheetDescription>
              Set up a recurring subscription or send a one-time invoice for this project.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-4">
            <Tabs defaultValue="subscription">
              <TabsList className="w-full">
                <TabsTrigger value="subscription" className="flex-1">
                  Recurring
                </TabsTrigger>
                <TabsTrigger value="onetime" className="flex-1">
                  One-Time
                </TabsTrigger>
              </TabsList>

              <TabsContent value="subscription" className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="proj-sub-amount">Amount (USD)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      $
                    </span>
                    <Input
                      id="proj-sub-amount"
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
                  <Label>Billing Interval</Label>
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

                {members.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Send Invoice To</Label>
                    <Select value={subEmail} onValueChange={setSubEmail}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a contact..." />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((m) => (
                          <SelectItem key={m.id} value={m.email}>
                            {m.firstName} {m.lastName} — {m.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <SheetFooter className="px-0 pt-2">
                  <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubscription}
                    disabled={saving || !subAmount || parseFloat(subAmount) <= 0}
                  >
                    {saving && <Spinner className="size-4 mr-2" />}
                    Create Subscription
                  </Button>
                </SheetFooter>
              </TabsContent>

              <TabsContent value="onetime" className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="proj-ot-amount">Amount (USD)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      $
                    </span>
                    <Input
                      id="proj-ot-amount"
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
                  <Label htmlFor="proj-ot-desc">Description</Label>
                  <Textarea
                    id="proj-ot-desc"
                    placeholder="Optional — defaults to project name"
                    rows={2}
                    className="resize-none"
                    value={otDescription}
                    onChange={(e) => setOtDescription(e.target.value)}
                  />
                </div>

                {members.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Send Invoice To</Label>
                    <Select value={otEmail} onValueChange={setOtEmail}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a contact..." />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((m) => (
                          <SelectItem key={m.id} value={m.email}>
                            {m.firstName} {m.lastName} — {m.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <SheetFooter className="px-0 pt-2">
                  <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleOneTime}
                    disabled={saving || !otAmount || parseFloat(otAmount) <= 0}
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
    </div>
  );
}
