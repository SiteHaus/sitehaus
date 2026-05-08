"use client";

import { listWebhookDeliveries, type WebhookDelivery } from "@/lib/commerce";
import { Badge } from "@site-haus/ui/components/base/badge";
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

function statusVariant(status: WebhookDelivery["status"]) {
  if (status === "delivered") return "default";
  if (status === "failed") return "destructive";
  return "secondary";
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
              <Badge variant={statusVariant(d.status)} className="capitalize text-xs">
                {d.status}
              </Badge>
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
