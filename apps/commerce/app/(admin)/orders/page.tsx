"use client";

import { listOrders, type AdminOrderSummary, type OrderStatus } from "@/lib/commerce";
import { Button } from "@site-haus/ui/components/base/button";
import { Input } from "@site-haus/ui/components/base/input";
import { Skeleton } from "@site-haus/ui/components/base/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@site-haus/ui/components/base/table";
import { Tabs, TabsList, TabsTrigger } from "@site-haus/ui/components/base/tabs";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OrderStatusBadge } from "./_components/order-status-badge";

const LIMIT = 20;

const STATUS_TABS: { label: string; value: OrderStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Refunded", value: "refunded" },
  { label: "Cancelled", value: "cancelled" },
];

function formatCents(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function OrdersPage() {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [email, setEmail] = useState("");
  const [emailSearch, setEmailSearch] = useState("");
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", status, emailSearch, offset],
    queryFn: () =>
      listOrders({
        status: status === "all" ? undefined : status,
        email: emailSearch || undefined,
        limit: LIMIT,
        offset,
        sort: "newest",
      }),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  function handleStatusChange(value: string) {
    setStatus(value as OrderStatus | "all");
    setOffset(0);
  }

  function handleEmailSearch(e: React.FormEvent) {
    e.preventDefault();
    setEmailSearch(email);
    setOffset(0);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isLoading ? "—" : `${total} order${total !== 1 ? "s" : ""}`}
          </p>
        </div>
        <form onSubmit={handleEmailSearch} className="flex gap-2">
          <Input
            placeholder="Search by email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-56"
          />
          <Button type="submit" variant="outline" size="sm">Search</Button>
          {emailSearch && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setEmail(""); setEmailSearch(""); setOffset(0); }}
            >
              Clear
            </Button>
          )}
        </form>
      </div>

      <Tabs value={status} onValueChange={handleStatusChange} className="mb-4">
        <TabsList>
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : data?.items.length === 0
              ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <ShoppingCart className="size-10 mb-3 opacity-30" />
                      <p className="font-medium">No orders found</p>
                    </div>
                  </TableCell>
                </TableRow>
              )
              : data?.items.map((order: AdminOrderSummary) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/orders/${order.id}`)}
                >
                  <TableCell className="font-mono text-sm font-medium">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{order.email}</TableCell>
                  <TableCell><OrderStatusBadge status={order.status} /></TableCell>
                  <TableCell className="text-muted-foreground">{order.itemCount}</TableCell>
                  <TableCell className="font-medium">
                    {formatCents(order.totalCents, order.currency)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={offset + LIMIT >= total} onClick={() => setOffset((o) => o + LIMIT)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
