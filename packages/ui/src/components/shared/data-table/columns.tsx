import { Badge } from "@site-haus/ui/components/base/badge";
import { Button } from "@site-haus/ui/components/base/button";
import { Checkbox } from "@site-haus/ui/components/base/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@site-haus/ui/components/base/dropdown-menu";
import { DataTableColumnHeader } from "@site-haus/ui/components/shared/data-table/data-table-column-header";
import { Column, ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Trash2 } from "lucide-react";

export interface RowActions<T> {
  onDelete?: (row: T) => void;
  onEdit?: (row: T) => void;
}

export type ColumnRenderers<T extends Record<string, unknown>> = {
  [K in keyof T]?: (value: unknown, row: T) => React.ReactNode;
};

function renderCellValue(
  value: unknown,
  columnKey?: string,
  columnRenderers?: Record<string, (value: unknown, row: unknown) => React.ReactNode>,
  row?: unknown,
): React.ReactNode {
  if (columnKey && columnRenderers?.[columnKey]) {
    return columnRenderers[columnKey]!(value, row);
  }

  if (Array.isArray(value)) {
    const hasNameProperty =
      value.length > 0 && typeof value[0] === "object" && value[0] !== null && "name" in value[0];

    if (hasNameProperty) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((item, index) => (
            <Badge key={item.id ?? index} variant="secondary">
              {item.name}
            </Badge>
          ))}
        </div>
      );
    }

    return value.map(String).join(", ");
  }

  if (typeof value === "boolean") {
    return <Badge variant={value ? "default" : "outline"}>{value ? "Yes" : "No"}</Badge>;
  }

  return String(value);
}

export function createColumnsFromData<T extends Record<string, unknown>>(
  data: T[],
  actions?: RowActions<T>,
  columnRenderers?: ColumnRenderers<T>,
  columnLabels?: Partial<Record<string, string>>,
): ColumnDef<T, unknown>[] {
  if (!data.length) return [];

  const selectColumn: ColumnDef<T, unknown> = {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <div data-stop-propagation onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  };

  const hasActions = actions?.onEdit || actions?.onDelete;

  const actionColumn: ColumnDef<T, unknown> = {
    id: "action",
    cell: ({ row }) => {
      if (!hasActions) return null;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4 text-gray-600" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            {actions?.onEdit && (
              <DropdownMenuItem onClick={() => actions.onEdit?.(row.original)}>
                Edit
              </DropdownMenuItem>
            )}
            {actions?.onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => actions.onDelete?.(row.original)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    enableHiding: true,
  };

  const dataColumns: ColumnDef<T, unknown>[] = Object.keys(data[0]!).map((key) => ({
    id: key,
    accessorKey: key as keyof T & string,
    filterFn: "equals",
    header: ({ column }: { column: Column<T, unknown> }) => (
      <DataTableColumnHeader
        column={column}
        title={columnLabels?.[key] ?? key.charAt(0).toUpperCase() + key.slice(1)}
      />
    ),
    cell: (info) =>
      renderCellValue(
        info.getValue(),
        key,
        columnRenderers as
          | Record<string, (value: unknown, row: unknown) => React.ReactNode>
          | undefined,
        info.row.original, // 👈 add this
      ),
  }));

  return [selectColumn, ...dataColumns, actionColumn];
}
