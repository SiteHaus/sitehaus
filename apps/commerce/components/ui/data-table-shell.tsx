"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@site-haus/ui/components/base/table";
import { Skeleton } from "@site-haus/ui/components/base/skeleton";
import { Button } from "@site-haus/ui/components/base/button";
import { cn } from "@site-haus/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "./empty-state";

export type Column = { header: React.ReactNode; className?: string };

export function DataTableShell<T>({
  columns,
  rows,
  renderRow,
  getRowKey,
  isLoading,
  empty,
  page,
  totalPages,
  onPageChange,
  onRowClick,
  className,
}: {
  columns: Column[];
  rows: T[];
  renderRow: (row: T) => React.ReactNode;
  getRowKey: (row: T) => string;
  isLoading?: boolean;
  empty: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode };
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onRowClick?: (row: T) => void;
  className?: string;
}) {
  const showPager = !!totalPages && totalPages > 1 && page != null && !!onPageChange;
  return (
    <div className={cn("sh-fade-in", className)}>
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c, i) => (
                <TableHead key={i} className={c.className}>
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <EmptyState
                    icon={empty.icon}
                    title={empty.title}
                    description={empty.description}
                    action={empty.action}
                    className="border-0"
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={getRowKey(row)}
                  className={onRowClick ? "cursor-pointer" : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {renderRow(row)}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {showPager && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page! <= 1}
              onClick={() => onPageChange!(page! - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page! >= totalPages!}
              onClick={() => onPageChange!(page! + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
