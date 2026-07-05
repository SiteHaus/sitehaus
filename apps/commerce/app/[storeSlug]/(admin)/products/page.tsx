"use client";

import { listProducts, type ProductItem, type ProductStatus } from "@/lib/commerce";
import { useStoreNav } from "@/lib/use-store-nav";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { Button } from "@site-haus/ui/components/base/button";
import { TableCell } from "@site-haus/ui/components/base/table";
import { Tabs, TabsList, TabsTrigger } from "@site-haus/ui/components/base/tabs";
import { useQuery } from "@tanstack/react-query";
import { Package, Plus } from "lucide-react";
import Image from "next/image";
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
  const { push } = useStoreNav();
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
      <PageHeader
        title="Products"
        subtitle={isLoading ? "—" : `${total} product${total !== 1 ? "s" : ""}`}
        actions={
          <Button onClick={() => push("/products/new")}>
            <Plus className="size-4" />
            New Product
          </Button>
        }
      />

      <Tabs value={status} onValueChange={handleStatusChange} className="mb-4">
        <TabsList>
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTableShell
        columns={[
          { header: "", className: "w-12" },
          { header: "Name" },
          { header: "Status" },
          { header: "Variants" },
          { header: "Created" },
        ]}
        rows={data?.items ?? []}
        getRowKey={(p) => p.id}
        isLoading={isLoading}
        onRowClick={(p) => push(`/products/${p.id}`)}
        empty={{
          icon: Package,
          title: "No products yet",
          description: "Create your first product to get started.",
        }}
        page={currentPage}
        totalPages={totalPages}
        onPageChange={(p) => setOffset((p - 1) * LIMIT)}
        renderRow={(product: ProductItem) => (
          <>
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
            <TableCell className="text-muted-foreground">{formatDate(product.createdAt)}</TableCell>
          </>
        )}
      />
    </div>
  );
}
