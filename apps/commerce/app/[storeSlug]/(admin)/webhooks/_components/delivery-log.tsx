"use client";

import {
  listWebhookDeliveries,
  type WebhookDelivery,
  type WebhookDeliveryStatus,
} from "@/lib/commerce";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Tone } from "@/components/ui/status-tone";
import { Skeleton } from "@site-haus/ui/components/base/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@site-haus/ui/components/base/table";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

function deliveryTone(status: WebhookDeliveryStatus): Tone {
  if (status === "delivered") return "success";
  if (status === "failed") return "danger";
  return "warning";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ResponseBody({ delivery }: { delivery: WebhookDelivery }) {
  const [expanded, setExpanded] = useState(false);

  if (!delivery.responseStatus) return <span className="text-muted-foreground">—</span>;

  return (
    <div>
      <span
        className={
          delivery.responseStatus >= 200 && delivery.responseStatus < 300
            ? "text-green-600 dark:text-green-400"
            : "text-destructive"
        }
      >
        HTTP {delivery.responseStatus}
      </span>
    </div>
  );
}

type Props = {
  endpointId: string;
};

export function DeliveryLog({ endpointId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["webhook-deliveries", endpointId],
    queryFn: () => listWebhookDeliveries(endpointId),
    staleTime: 15_000,
  });

  const deliveries = data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No deliveries yet for this endpoint.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Event</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Response</TableHead>
          <TableHead>Attempts</TableHead>
          <TableHead>Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {deliveries.map((d) => (
          <TableRow key={d.id}>
            <TableCell className="font-mono text-xs">{d.event}</TableCell>
            <TableCell>
              <StatusBadge
                tone={deliveryTone(d.status)}
                label={d.status.charAt(0).toUpperCase() + d.status.slice(1)}
              />
            </TableCell>
            <TableCell className="text-sm">
              <ResponseBody delivery={d} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{d.attemptCount}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {d.lastAttemptAt ? formatDate(d.lastAttemptAt) : formatDate(d.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
