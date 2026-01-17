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

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning";

function getStatusBadgeVariant(status: string): BadgeVariant {
  const normalized = status.toLowerCase();
  switch (normalized) {
    case "accepted":
    case "active":
    case "verified":
      return "success";
    case "cancelled":
    case "revoked":
      return "warning";
    case "expired":
    case "rejected":
    case "failed":
      return "destructive";
    case "pending":
    case "invited":
      return "secondary";
    default:
      return "outline";
  }
}

function renderCellValue(value: unknown, columnKey?: string): React.ReactNode {
  if (value === null || value === undefined) {
    return "";
  }

  // Handle status column specially
  if (columnKey === "status" && typeof value === "string") {
    return (
      <Badge variant={getStatusBadgeVariant(value)}>
        {value}
      </Badge>
    );
  }

  // Handle arrays of objects with name property (like roles)
  if (Array.isArray(value)) {
    const hasNameProperty = value.length > 0 && typeof value[0] === "object" && value[0] !== null && "name" in value[0];

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

    // Regular array - join values
    return value.map(String).join(", ");
  }

  // Handle booleans
  if (typeof value === "boolean") {
    return (
      <Badge variant={value ? "default" : "outline"}>
        {value ? "Yes" : "No"}
      </Badge>
    );
  }

  return String(value);
}

export function createColumnsFromData<T extends Record<string, unknown>>(
  data: T[],
  actions?: RowActions<T>
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
      cell: (info) => renderCellValue(info.getValue(), key),
    })
  );

  return [selectColumn, ...dataColumns, actionColumn];
}
