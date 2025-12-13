import { Button } from "@site-haus/ui/components/base/button";
import { Checkbox } from "@site-haus/ui/components/base/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@site-haus/ui/components/base/dropdown-menu";
import { DataTableColumnHeader } from "@site-haus/ui/components/shared/data-table/data-table-column-header";
import { Column, ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

export function createColumnsFromData<T extends Record<string, unknown>>(
  data: T[]
): ColumnDef<T, unknown>[] {
  if (!data.length) return [];

  const selectColumn: ColumnDef<T, unknown> = {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };

  const actionColumn: ColumnDef<T, unknown> = {
    id: "action",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4 text-gray-600" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem>Edit</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    enableSorting: false,
    enableHiding: true,
  };

  const dataColumns: ColumnDef<T, unknown>[] = Object.keys(data[0]!).map(
    (key) => ({
      id: key,
      accessorKey: key as keyof T & string,
      header: ({ column }: { column: Column<T, unknown> }) => (
        <DataTableColumnHeader
          column={column}
          title={key.charAt(0).toUpperCase() + key.slice(1)}
        />
      ),
      cell: (info) => String(info.getValue() ?? ""),
    })
  );

  return [selectColumn, ...dataColumns, actionColumn];
}
