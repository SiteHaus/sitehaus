"use client";

import { useState, useMemo, useEffect } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  VisibilityState,
  useReactTable,
  ColumnFiltersState,
  getFilteredRowModel,
  ColumnDef,
} from "@tanstack/react-table";
import {
  Table as BaseTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@site-haus/ui/components/base/table";
import { Input } from "@site-haus/ui/components/base/input";
import { createColumnsFromData } from "@site-haus/ui/components/shared/data-table/columns";
import { DataTablePagination } from "@site-haus/ui/components/shared/data-table/data-table-pagination";
import { DataTableViewOptions } from "@site-haus/ui/components/shared/data-table/data-table-column-toggle";

interface DataTableProps<TData> {
  data: TData[];
  defaultColumns: string[];
}

export function DataTable<TData>({
  data,
  defaultColumns,
}: DataTableProps<TData>) {
  if (!data || !data.length) return <div>No data.</div>;

  const columns = useMemo(() => createColumnsFromData(data), [data]);
  const [globalFilter, setGlobalFilter] = useState<any>([]);

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  useEffect(() => {
    const newVisibility = Object.fromEntries(
      columns.map((col) => {
        if (col.id === "select" || col.id === "action") {
          return [col.id, true];
        }
        return [col.id as string, defaultColumns.includes(col.id as string)];
      })
    );

    setColumnVisibility(newVisibility);
  }, [defaultColumns, columns]);

  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      columnVisibility,
      rowSelection,
      sorting,
      columnFilters,
      globalFilter,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,

    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
  });

  console.log(columnVisibility);

  return (
    <div className="overflow-hidden rounded-md border p-4">
      <div className="flex">
        <div>
          <Input
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search..."
          />
        </div>
        <DataTableViewOptions table={table} />
      </div>

      <div className="py-1" />
      <BaseTable>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="cursor-pointer">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={table.getAllColumns().length}
                className="h-24 text-center"
              >
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </BaseTable>
      <DataTablePagination table={table} />
    </div>
  );
}
