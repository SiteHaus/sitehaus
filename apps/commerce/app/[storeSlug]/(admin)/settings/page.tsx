"use client";

import {
  connectStripe,
  getMyStore,
  getStripeStatus,
  listShippingZones,
  updateStore,
  type FulfillmentType,
  type NotificationPreferences,
  type ShippingZone,
  type StoreDetail,
  type StripeStatus,
} from "@/lib/commerce";
import { useStoreNav } from "@/lib/use-store-nav";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@site-haus/ui/components/base/button";
import { Input } from "@site-haus/ui/components/base/input";
import { Label } from "@site-haus/ui/components/base/label";
import { Switch } from "@site-haus/ui/components/base/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@site-haus/ui/components/base/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const CURRENCIES = [
  { value: "usd", label: "USD — US Dollar" },
  { value: "cad", label: "CAD — Canadian Dollar" },
  { value: "eur", label: "EUR — Euro" },
  { value: "gbp", label: "GBP — British Pound" },
  { value: "aud", label: "AUD — Australian Dollar" },
];

export default function SettingsPage() {
  const { storeSlug } = useStoreNav();
  const queryClient = useQueryClient();

  const { data: store, isLoading } = useQuery<StoreDetail>({
    queryKey: ["store"],
    queryFn: getMyStore,
  });

  const { data: stripeStatus } = useQuery<StripeStatus>({
    queryKey: ["stripe-status"],
    queryFn: getStripeStatus,
    enabled: !!store,
  });

  const { data: shippingZones } = useQuery<{ items: ShippingZone[] }>({
    queryKey: ["shipping-zones"],
    queryFn: listShippingZones,
    enabled: !!store,
  });

  // Form state
  const [slug, setSlug] = useState("");
  const [domain, setDomain] = useState("");
  const [currency, setCurrency] = useState("usd");
  const [reservationTtl, setReservationTtl] = useState(15);
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>("shipping");
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    newOrder: true,
    returnRequested: true,
    lowStock: true,
    paymentFailed: true,
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!store) return;
    setSlug(store.slug);
    setDomain(store.domain ?? "");
    setCurrency(store.currency);
    setReservationTtl(store.reservationTtlMinutes);
    setFulfillmentType(store.fulfillmentType);
    setNotifications({
      newOrder: store.notificationPreferences?.newOrder ?? true,
      returnRequested: store.notificationPreferences?.returnRequested ?? true,
      lowStock: store.notificationPreferences?.lowStock ?? true,
      paymentFailed: store.notificationPreferences?.paymentFailed ?? true,
    });
  }, [store]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await updateStore({
        slug: slug || undefined,
        domain: domain || null,
        currency,
        reservationTtlMinutes: reservationTtl,
        fulfillmentType,
        notificationPreferences: notifications,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store"] });
      setDirty(false);
      toast.success("Settings saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const connectMutation = useMutation({
    mutationFn: () => connectStripe(`${window.location.origin}/${storeSlug}/settings`),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const confirmTaxMutation = useMutation({
    mutationFn: () => updateStore({ taxRegistrationConfirmed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store"] });
      toast.success("Tax registration marked as confirmed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function markDirty() {
    setDirty(true);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const saveButton = (
    <Button onClick={() => saveMutation.mutate()} disabled={!dirty || saveMutation.isPending}>
      {saveMutation.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
      Save Changes
    </Button>
  );

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle={store?.slug}
        actions={dirty ? saveButton : undefined}
      />

      <div className="space-y-4">
        {/* Go-live checklist */}
        <SectionCard
          title="Go-Live Checklist"
          description="What checkout enforces before this store can take a real payment."
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <StatusRow
                label="Shipping zones configured"
                enabled={(shippingZones?.items.length ?? 0) > 0}
              />
              {(shippingZones?.items.length ?? 0) === 0 && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`/${storeSlug}/shipping`}>Configure</a>
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between gap-4">
              <StatusRow
                label="Stripe connected"
                enabled={!!(stripeStatus?.connected && stripeStatus?.chargesEnabled)}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <StatusRow
                label="Tax registration confirmed"
                enabled={!!store?.taxRegistrationConfirmed}
              />
              {!store?.taxRegistrationConfirmed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => confirmTaxMutation.mutate()}
                  disabled={confirmTaxMutation.isPending}
                >
                  {confirmTaxMutation.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                  Mark as confirmed
                </Button>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Store Info */}
        <SectionCard
          title="Store Info"
          description="Your store's public-facing slug, custom domain, and currency."
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground select-none">
                  {process.env.NEXT_PUBLIC_STOREFRONT_BASE_URL ?? "https://store.sitehaus.dev"}/
                </span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    markDirty();
                  }}
                  placeholder="my-store"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens only.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="domain">Custom Domain</Label>
              <Input
                id="domain"
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value);
                  markDirty();
                }}
                placeholder="shop.yourdomain.com"
              />
              <p className="text-xs text-muted-foreground">
                Point a CNAME to{" "}
                <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                  stores.sitehaus.dev
                </code>{" "}
                then enter the domain here.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={currency}
                onValueChange={(v) => {
                  setCurrency(v);
                  markDirty();
                }}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </SectionCard>

        {/* Fulfillment */}
        <SectionCard title="Fulfillment" description="How customers receive their orders.">
          <div className="space-y-3">
            <Select
              value={fulfillmentType}
              onValueChange={(v) => {
                setFulfillmentType(v as FulfillmentType);
                markDirty();
              }}
            >
              <SelectTrigger id="fulfillment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shipping">Shipping — ship orders to customers</SelectItem>
                <SelectItem value="pickup">In-Person Pickup — customers collect locally</SelectItem>
              </SelectContent>
            </Select>
            {fulfillmentType === "pickup" && (
              <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-300">
                <AlertCircle className="size-4 mt-0.5 shrink-0" />
                <span>
                  Pickup mode disables shipping address collection and tracking numbers. Confirmed
                  orders will show a "Ready for Pickup" action instead of "Mark Shipped."
                </span>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Notifications */}
        <SectionCard
          title="Notifications"
          description="Emails sent to you when store activity needs your attention."
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="notify-new-order">New order placed</Label>
                <p className="text-xs text-muted-foreground">
                  Email you when a customer places and pays for an order.
                </p>
              </div>
              <Switch
                id="notify-new-order"
                checked={notifications.newOrder ?? false}
                onCheckedChange={(checked) => {
                  setNotifications((prev) => ({ ...prev, newOrder: checked }));
                  markDirty();
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="notify-return-requested">Return requested</Label>
                <p className="text-xs text-muted-foreground">
                  Email you when a customer requests a return.
                </p>
              </div>
              <Switch
                id="notify-return-requested"
                checked={notifications.returnRequested ?? false}
                onCheckedChange={(checked) => {
                  setNotifications((prev) => ({ ...prev, returnRequested: checked }));
                  markDirty();
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="notify-payment-failed">Payment failed</Label>
                <p className="text-xs text-muted-foreground">
                  Email you when a customer's payment or refund fails to process.
                </p>
              </div>
              <Switch
                id="notify-payment-failed"
                checked={notifications.paymentFailed ?? false}
                onCheckedChange={(checked) => {
                  setNotifications((prev) => ({ ...prev, paymentFailed: checked }));
                  markDirty();
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="notify-low-stock">Low stock</Label>
                <p className="text-xs text-muted-foreground">
                  Email you when a product's inventory runs low. Coming soon — this toggle is saved
                  but nothing sends this email yet.
                </p>
              </div>
              <Switch
                id="notify-low-stock"
                checked={notifications.lowStock ?? false}
                onCheckedChange={(checked) => {
                  setNotifications((prev) => ({ ...prev, lowStock: checked }));
                  markDirty();
                }}
              />
            </div>
          </div>
        </SectionCard>

        {/* Cart Reservation */}
        <SectionCard
          title="Cart Reservation"
          description="How long inventory is held in an open cart (5–60 min)."
        >
          <div className="flex items-center gap-3">
            <Input
              id="ttl"
              type="number"
              min={5}
              max={60}
              value={reservationTtl}
              onChange={(e) => {
                setReservationTtl(Number(e.target.value));
                markDirty();
              }}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">minutes</span>
          </div>
        </SectionCard>

        {/* Stripe */}
        <SectionCard title="Stripe" description="Connect Stripe to accept payments on your store.">
          {stripeStatus?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="size-4 text-green-500" />
                <span className="font-medium">Stripe connected</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <StatusRow label="Charges" enabled={stripeStatus.chargesEnabled} />
                <StatusRow label="Payouts" enabled={stripeStatus.payoutsEnabled} />
                <StatusRow label="Details submitted" enabled={stripeStatus.detailsSubmitted} />
              </div>
              {!stripeStatus.detailsSubmitted && (
                <div className="flex items-start gap-2 rounded-md bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-3 text-sm text-yellow-800 dark:text-yellow-300">
                  <AlertCircle className="size-4 mt-0.5 shrink-0" />
                  <span>
                    Your Stripe account setup is incomplete. Finish onboarding to enable payments.
                  </span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending}
              >
                {connectMutation.isPending ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="size-4 mr-2" />
                )}
                Open Stripe Dashboard
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You haven't connected a Stripe account yet. Connect one to start accepting payments.
              </p>
              <Button onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending}>
                {connectMutation.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                Connect Stripe
              </Button>
            </div>
          )}
        </SectionCard>

        {/* Danger Zone */}
        <SectionCard
          title="Danger Zone"
          description="Irreversible actions — proceed with care."
          className="border-destructive/40"
          titleClassName="text-destructive"
        >
          <div>
            <p className="text-sm font-medium">Store ID</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{store?.id}</p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function StatusRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {enabled ? (
        <CheckCircle className="size-3.5 text-green-500 shrink-0" />
      ) : (
        <AlertCircle className="size-3.5 text-muted-foreground shrink-0" />
      )}
      <span className={enabled ? "" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}
