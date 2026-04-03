"use client";

import {
  Table as BaseTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@site-haus/ui/components/base/table";
import {
  createColumnsFromData,
  RowActions,
  ColumnRenderers,
} from "@site-haus/ui/components/shared/data-table/columns";
import { DataTableViewOptions } from "@site-haus/ui/components/shared/data-table/data-table-column-toggle";
import { DataTablePagination } from "@site-haus/ui/components/shared/data-table/data-table-pagination";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@site-haus/ui/components/base/dropdown-menu";
import { Button } from "@site-haus/ui/components/base/button";
import { ChevronDown } from "lucide-react";

type KeyOf<T> = Extract<keyof T, string>;
export type ColumnFilterOption = { label: string; value: string };

const ALL_FILTER_VALUE = "__all__";

interface DataTableProps<TData extends Record<string, unknown>> {
  data: TData[];
  defaultColumns: KeyOf<TData>[];
  actions?: RowActions<TData>;
  columnLabels?: Partial<Record<KeyOf<TData>, string>>;
  filterOptions?: Partial<Record<KeyOf<TData>, ColumnFilterOption[]>>;
  filterTitles?: Partial<Record<KeyOf<TData>, string>>;
  onSelectionChange?: (rows: TData[]) => void;
  onRowClick?: (row: TData) => void;
  excludeColumns?: KeyOf<TData>[];
  columnRenderers?: ColumnRenderers<TData>; // add this
}

export function DataTable<TData extends Record<string, unknown>>({
  data,
  defaultColumns,
  actions,
  columnLabels,
  filterOptions,
  filterTitles,
  onSelectionChange,
  onRowClick,
  excludeColumns,
  columnRenderers,
}: DataTableProps<TData>) {
  const columns = useMemo<ColumnDef<TData, unknown>[]>(
    () =>
      createColumnsFromData<TData>(data, actions, columnRenderers, columnLabels).filter(
        (col) => !excludeColumns?.includes(col.id as KeyOf<TData>),
      ),
    [data, actions, columnLabels, excludeColumns, columnRenderers, columnLabels],
  );

  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const table = useReactTable<TData>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
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
    onSortingChange: setSorting,
  });

  useEffect(() => {
    const newVisibility = Object.fromEntries(
      columns.map((col) => {
        if (col.id === "select" || col.id === "action") {
          return [col.id, true];
        }
        return [col.id as string, defaultColumns.includes(col.id as KeyOf<TData>)];
      }),
    );
    setColumnVisibility(newVisibility);
  }, [defaultColumns, columns]);

  useEffect(() => {
    const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);
    onSelectionChange?.(selectedRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection]);

  function getFilterLabel(key: string, options: ColumnFilterOption[]): string {
    const active = activeFilters[key];
    const title = filterTitles?.[key as KeyOf<TData>] ?? columnLabels?.[key as KeyOf<TData>] ?? key;
    if (!active || active === ALL_FILTER_VALUE) return title;
    return options.find((o) => o.value === active)?.label ?? title;
  }

  function clearFilter(key: string) {
    table.getColumn(key)?.setFilterValue(undefined);
    setActiveFilters((prev) => ({ ...prev, [key]: ALL_FILTER_VALUE }));
  }

  function applyFilter(key: string, value: string) {
    table.getColumn(key)?.setFilterValue(value);
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div
      className="overflow-hidden rounded-md border w-full font-mono"
      style={{
        background: "var(--table-surface)",
        borderColor: "var(--table-border)",
        boxShadow: "0 8px 40px var(--table-shadow)",
      }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{
          background: "var(--table-header-bg)",
          borderColor: "var(--table-border)",
        }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--table-text-header)" }}
        >
          {data.length} {data.length === 1 ? "item" : "items"}
        </span>
        <div className="flex gap-2 items-center">
          {filterOptions &&
            Object.entries(filterOptions).map(([key, options]) => (
              <DropdownMenu key={key}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs tracking-wide transition-colors h-8 px-3"
                    style={{
                      background: "var(--table-control-bg)",
                      borderColor: "var(--table-control-border)",
                      color: "var(--table-control-text)",
                    }}
                  >
                    {getFilterLabel(key, options as ColumnFilterOption[])}
                    <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  style={{
                    background: "var(--table-control-bg)",
                    borderColor: "var(--table-control-border)",
                    color: "var(--table-control-text)",
                  }}
                  className="font-mono text-xs"
                >
                  <DropdownMenuItem
                    style={{ color: "var(--table-text-dim)" }}
                    onSelect={() => clearFilter(key)}
                  >
                    All
                  </DropdownMenuItem>
                  {(options as ColumnFilterOption[]).map((opt) => (
                    <DropdownMenuItem key={opt.value} onSelect={() => applyFilter(key, opt.value)}>
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ))}
          <DataTableViewOptions table={table} columnLabels={columnLabels} />
        </div>
      </div>

      <BaseTable className="text-sm w-full">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="hover:bg-transparent"
              style={{ borderColor: "var(--table-border)" }}
            >
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="uppercase tracking-widest text-[11px] font-bold py-3 px-5 whitespace-nowrap"
                  style={{
                    background: "var(--table-header-bg)",
                    color: "var(--table-text-header)",
                    borderBottom: "2px solid var(--table-border)",
                  }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row, i) => (
              <TableRow
                key={row.id}
                className="cursor-pointer transition-colors duration-100"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("[data-stop-propagation]")) return;
                  onRowClick?.(row.original);
                }}
                style={{
                  background: i % 2 === 0 ? "var(--table-bg)" : "var(--table-bg-alt)",
                  color: "var(--table-text)",
                  borderColor: "var(--table-border)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--table-hover-bg)";
                  (e.currentTarget as HTMLElement).style.color = "var(--table-hover-text)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    i % 2 === 0 ? "var(--table-bg)" : "var(--table-bg-alt)";
                  (e.currentTarget as HTMLElement).style.color = "var(--table-text)";
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="px-5 py-4 text-sm align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent border-none">
              <TableCell
                colSpan={table.getAllColumns().length}
                className="h-40 text-center text-sm tracking-wide"
                style={{ color: "var(--table-text-dim)" }}
              >
                No tickets yet. When you have a question or need something changed, submit a ticket
                and we'll get right on it!
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </BaseTable>

      <div
        className="px-5 py-3"
        style={{
          borderTop: "1px solid var(--table-border)",
          background: "var(--table-header-bg)",
        }}
      >
        <DataTablePagination table={table} />
      </div>
    </div>
  );
}
