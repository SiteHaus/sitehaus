"use client";

import {
  deleteWebhookEndpoint,
  listWebhookEndpoints,
  updateWebhookEndpoint,
  type WebhookEndpoint,
  type WebhookEndpointWithSecret,
} from "@/lib/commerce";
import { Badge } from "@site-haus/ui/components/base/badge";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@site-haus/ui/components/base/dialog";
import { Skeleton } from "@site-haus/ui/components/base/skeleton";
import { Switch } from "@site-haus/ui/components/base/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@site-haus/ui/components/base/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Webhook,
  Zap,
} from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { useState } from "react";
import { toast } from "sonner";
import { DeliveryLog } from "./_components/delivery-log";
import { EndpointDialog } from "./_components/endpoint-dialog";
import { SecretDialog } from "./_components/secret-dialog";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function EventBadges({ events }: { events: string[] }) {
  const visible = events.slice(0, 3);
  const rest = events.length - visible.length;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((e) => (
        <Badge key={e} variant="secondary" className="font-mono text-xs font-normal">
          {e}
        </Badge>
      ))}
      {rest > 0 && (
        <Badge variant="secondary" className="text-xs font-normal">
          +{rest} more
        </Badge>
      )}
    </div>
  );
}

function EndpointRow({ endpoint }: { endpoint: WebhookEndpoint }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const toggleMutation = useMutation({
    mutationFn: (isActive: boolean) => updateWebhookEndpoint(endpoint.id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhook-endpoints"] }),
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteWebhookEndpoint(endpoint.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhook-endpoints"] });
      toast.success("Endpoint deleted");
      setDeleteOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <>
      <TableRow className="cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        <TableCell className="w-8 pl-4">
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell className="font-mono text-sm max-w-[220px] truncate">{endpoint.url}</TableCell>
        <TableCell>
          <EventBadges events={endpoint.events} />
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={endpoint.isActive}
            onCheckedChange={(v) => toggleMutation.mutate(v)}
            disabled={toggleMutation.isPending}
          />
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {formatDate(endpoint.createdAt)}
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow>
          <TableCell colSpan={6} className="p-0 bg-muted/30">
            <div className="border-t">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-4 pt-3 pb-2">
                Delivery Log
              </p>
              <DeliveryLog endpointId={endpoint.id} />
            </div>
          </TableCell>
        </TableRow>
      )}

      <EndpointDialog open={editOpen} onClose={() => setEditOpen(false)} endpoint={endpoint} />

      <Dialog open={deleteOpen} onOpenChange={(o) => !o && setDeleteOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete endpoint?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the endpoint and stop all deliveries to{" "}
            <span className="font-mono text-xs">{endpoint.url}</span>.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function WebhooksPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingSecret, setPendingSecret] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["webhook-endpoints"],
    queryFn: listWebhookEndpoints,
    staleTime: 30_000,
  });

  const endpoints = data ?? [];

  function handleCreated(result: WebhookEndpointWithSecret) {
    setPendingSecret(result.secret);
    toast.success("Endpoint created");
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon={Zap}
        title="Webhooks"
        subtitle="Send real-time event notifications to your own endpoints."
      >
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4 mr-2" />
          Add Endpoint
        </Button>
      </PageHero>

      {isLoading ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>URL</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell />
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-9 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : endpoints.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border rounded-lg bg-card">
          <Webhook className="size-10 text-muted-foreground/40 mb-4" />
          <p className="font-medium">No webhook endpoints configured</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Add an endpoint to start receiving real-time event notifications.
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4 mr-2" />
            Add Endpoint
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 pl-4" />
                <TableHead>URL</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {endpoints.map((ep) => (
                <EndpointRow key={ep.id} endpoint={ep} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <EndpointDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />

      {pendingSecret && (
        <SecretDialog
          open={!!pendingSecret}
          secret={pendingSecret}
          onClose={() => setPendingSecret(null)}
        />
      )}
    </div>
  );
}
