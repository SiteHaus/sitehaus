"use client";

import { listProducts, type ProductItem, type ProductStatus } from "@/lib/commerce";
import { Button } from "@site-haus/ui/components/base/button";
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
import { Package, Plus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StatusBadge } from "./_components/status-badge";

const LIMIT = 20;

const STATUS_TABS: { label: string; value: ProductStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Archived", value: "archived" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ProductsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ProductStatus | "all">("all");
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["products", status, offset],
    queryFn: () =>
      listProducts({
        status: status === "all" ? undefined : status,
        limit: LIMIT,
        offset,
      }),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  function handleStatusChange(value: string) {
    setStatus(value as ProductStatus | "all");
    setOffset(0);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isLoading ? "—" : `${total} product${total !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button onClick={() => router.push("/products/new")}>
          <Plus className="size-4" />
          New Product
        </Button>
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
              <TableHead className="w-12"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Variants</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="size-10 rounded" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Package className="size-10 mb-3 opacity-30" />
                    <p className="font-medium">No products yet</p>
                    <p className="text-sm mt-1">Create your first product to get started.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((product: ProductItem) => (
                <TableRow
                  key={product.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/products/${product.id}`)}
                >
                  <TableCell>
                    {product.primaryImage ? (
                      <Image
                        src={product.primaryImage.cdnUrl}
                        alt={product.primaryImage.altText ?? product.name}
                        width={40}
                        height={40}
                        className="rounded object-cover size-10"
                      />
                    ) : (
                      <div className="size-10 rounded bg-muted flex items-center justify-center">
                        <Package className="size-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <StatusBadge status={product.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{product.variantCount}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(product.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + LIMIT >= total}
              onClick={() => setOffset((o) => o + LIMIT)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
