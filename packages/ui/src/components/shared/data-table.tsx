"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@site-haus/ui/components/base/table";

import { useState } from "react";

function cleanValue(value: any, header: string): string {
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number" && header.includes("Cents"))
    return `$${(value / 100).toFixed(2)}`;
  if (value === null || value === undefined) return "-";
  return String(value);
}

interface DataTableProps<T extends Record<string, any>> {
  table: T[];
}

export default function DataTable<T extends Record<string, any>>({
  table,
}: DataTableProps<T>) {
  const [selectedRow, setSelectedRow] = useState<T | null>(null);

  if (table.length === 0)
    return (
      <div className="flex items-center justify-center text-gray-500 h-32">
        No data
      </div>
    );

  const headers = Object.keys(table[0]!) as (keyof T)[];

  return (
    <div className="space-y-6 relative">
      <div className="overflow-x-auto">
        <Table className="rounded-lg shadow-md min-w-full">
          <TableHeader>
            <TableRow>
              {headers.map((header) => (
                <TableHead key={String(header)} className="whitespace-nowrap">
                  {String(header)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {table.map((row, i) => (
              <TableRow
                key={i}
                onClick={() => setSelectedRow(row)}
                className="hover:bg-gray-100 cursor-pointer"
              >
                {headers.map((header) => {
                  const value = row[header];
                  const cleaned = cleanValue(value, String(header));
                  return (
                    <TableCell
                      key={String(header)}
                      className="whitespace-nowrap"
                    >
                      {cleaned}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedRow && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-xl max-w-lg w-full space-y-4">
            <h3 className="text-xl font-semibold">Details</h3>
            <div className="space-y-2">
              {headers.map((header) => (
                <div
                  key={String(header)}
                  className="flex justify-between text-sm"
                >
                  <span className="font-medium">{String(header)}</span>
                  <span className="text-right">
                    {cleanValue(selectedRow[header], String(header))}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-right">
              <button
                className="mt-4 px-4 py-2 rounded bg-black text-white hover:bg-gray-800"
                onClick={() => setSelectedRow(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
