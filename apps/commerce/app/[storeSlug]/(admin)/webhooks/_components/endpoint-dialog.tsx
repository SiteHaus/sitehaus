"use client";

import {
  createWebhookEndpoint,
  updateWebhookEndpoint,
  type WebhookEndpoint,
  type WebhookEndpointWithSecret,
  type WebhookEvent,
} from "@/lib/commerce";
import { Button } from "@site-haus/ui/components/base/button";
import { Checkbox } from "@site-haus/ui/components/base/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@site-haus/ui/components/base/dialog";
import { Input } from "@site-haus/ui/components/base/input";
import { Label } from "@site-haus/ui/components/base/label";
import { Separator } from "@site-haus/ui/components/base/separator";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const EVENT_GROUPS: { label: string; events: { value: WebhookEvent; label: string }[] }[] = [
  {
    label: "Orders",
    events: [
      { value: "order.confirmed", label: "Order confirmed" },
      { value: "order.shipped", label: "Order shipped" },
      { value: "order.delivered", label: "Order delivered" },
      { value: "order.refunded", label: "Order refunded" },
    ],
  },
  {
    label: "Returns",
    events: [
      { value: "return.requested", label: "Return requested" },
      { value: "return.approved", label: "Return approved" },
      { value: "return.refunded", label: "Return refunded" },
    ],
  },
  {
    label: "Inventory",
    events: [{ value: "inventory.low", label: "Inventory low" }],
  },
  {
    label: "Products",
    events: [{ value: "product.published", label: "Product published" }],
  },
];

const ALL_EVENTS: WebhookEvent[] = EVENT_GROUPS.flatMap((g) => g.events.map((e) => e.value));

type Props = {
  open: boolean;
  onClose: () => void;
  endpoint?: WebhookEndpoint;
  onCreated?: (result: WebhookEndpointWithSecret) => void;
};

export function EndpointDialog({ open, onClose, endpoint, onCreated }: Props) {
  const qc = useQueryClient();
  const isEdit = !!endpoint;

  const [url, setUrl] = useState(endpoint?.url ?? "");
  const [events, setEvents] = useState<WebhookEvent[]>((endpoint?.events as WebhookEvent[]) ?? []);

  function reset() {
    setUrl(endpoint?.url ?? "");
    setEvents((endpoint?.events as WebhookEvent[]) ?? []);
  }

  function toggle(event: WebhookEvent) {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  }

  const allSelected = ALL_EVENTS.every((e) => events.includes(e));

  function toggleAll() {
    setEvents(allSelected ? [] : [...ALL_EVENTS]);
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      isEdit
        ? updateWebhookEndpoint(endpoint.id, { url, events })
        : createWebhookEndpoint({ url, events }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["webhook-endpoints"] });
      if (!isEdit && onCreated) {
        onCreated(result as WebhookEndpointWithSecret);
      } else {
        toast.success("Endpoint updated");
      }
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canSave = url.trim().length > 0 && events.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Endpoint" : "New Webhook Endpoint"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="webhook-url">URL</Label>
            <Input
              id="webhook-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhooks"
              autoFocus
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Events</Label>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={toggleAll}
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            </div>

            <div className="space-y-4">
              {EVENT_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    {group.label}
                  </p>
                  <div className="space-y-2">
                    {group.events.map((ev) => (
                      <div key={ev.value} className="flex items-center gap-2">
                        <Checkbox
                          id={ev.value}
                          checked={events.includes(ev.value)}
                          onCheckedChange={() => toggle(ev.value)}
                        />
                        <label
                          htmlFor={ev.value}
                          className="text-sm cursor-pointer select-none flex-1"
                        >
                          {ev.label}
                          <span className="ml-2 font-mono text-xs text-muted-foreground">
                            {ev.value}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                  <Separator className="mt-3" />
                </div>
              ))}
            </div>

            {events.length === 0 && (
              <p className="text-xs text-destructive">Select at least one event.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!canSave || saveMutation.isPending}
          >
            {saveMutation.isPending && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
