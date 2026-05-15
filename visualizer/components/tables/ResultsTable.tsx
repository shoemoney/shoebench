"use client";

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ModelRow } from "@/lib/types";

// ---------------------------------------------------------------------------
// Format helpers (module scope, pure — no React, no side effects)
// ---------------------------------------------------------------------------

function formatPercent(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return n.toFixed(1) + "%";
}

function formatTotalCost(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return "$" + n.toFixed(2);
}

function formatCostPerCorrect(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return "$" + n.toFixed(4);
}

function formatInt(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString();
}

function formatLatencyMs(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return Math.round(n).toLocaleString() + " ms";
}

// ---------------------------------------------------------------------------
// Column meta type extension — adds `align` for right-alignment routing.
// ---------------------------------------------------------------------------

type ColumnMeta = {
  align?: "right";
};

// ---------------------------------------------------------------------------
// Module-level columns const (PITFALLS Pitfall 6: never re-created per render)
// 15 columns, locked left-to-right order per CONTEXT.md.
// ---------------------------------------------------------------------------

const columns: ColumnDef<ModelRow, unknown>[] = [
  {
    id: "modelName",
    accessorKey: "modelName",
    header: "Model",
    cell: ({ row }) => `${row.original.providerIcon}${row.original.displayName}`,
  },
  {
    accessorKey: "overallAccuracy",
    header: "Accuracy %",
    cell: ({ getValue }) => formatPercent(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
  },
  {
    accessorKey: "exactMatches",
    header: "Exact",
    cell: ({ getValue }) => formatInt(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
  },
  {
    accessorKey: "variantMatches",
    header: "Variant",
    cell: ({ getValue }) => formatInt(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
  },
  {
    accessorKey: "brandOnlyMatches",
    header: "Brand-only",
    cell: ({ getValue }) => formatInt(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
  },
  {
    accessorKey: "wrongMatches",
    header: "Wrong",
    cell: ({ getValue }) => formatInt(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
  },
  {
    accessorKey: "easyAccuracy",
    header: "Easy %",
    cell: ({ getValue }) => formatPercent(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
  },
  {
    accessorKey: "mediumAccuracy",
    header: "Medium %",
    cell: ({ getValue }) => formatPercent(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
  },
  {
    accessorKey: "hardAccuracy",
    header: "Hard %",
    cell: ({ getValue }) => formatPercent(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
  },
  {
    accessorKey: "totalCost",
    header: "Total Cost",
    cell: ({ getValue }) => formatTotalCost(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
  },
  {
    accessorKey: "costPerCorrect",
    header: "Cost / Correct",
    cell: ({ getValue }) => formatCostPerCorrect(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
  },
  {
    accessorKey: "avgLatency",
    header: "Avg Latency",
    cell: ({ getValue }) => formatLatencyMs(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
  },
  {
    accessorKey: "inputTokensTotal",
    header: "Input Tokens",
    cell: ({ getValue }) => formatInt(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
  },
  {
    accessorKey: "outputTokensTotal",
    header: "Output Tokens",
    cell: ({ getValue }) => formatInt(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
  },
  {
    accessorKey: "tokensPerShoe",
    header: "Tokens / Shoe",
    cell: ({ getValue }) => formatInt(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ResultsTable({ rows }: { rows: ModelRow[] }) {
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // PITFALLS Pitfall 1: stable React keys across sort/filter
    getRowId: (row) => row.modelName,
  });

  const rowCount = table.getRowModel().rows.length;

  return (
    // PITFALLS Pitfall 6: single root TooltipProvider, not per-cell.
    <TooltipProvider>
      <div className="rounded-md border border-neutral-800">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as
                    | ColumnMeta
                    | undefined;
                  const align = meta?.align;
                  const isModel = header.column.id === "modelName";
                  const headClass = isModel
                    ? "text-neutral-300"
                    : align === "right"
                    ? "text-neutral-300 text-right"
                    : "text-neutral-300";
                  return (
                    <TableHead key={header.id} className={headClass}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rowCount === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-neutral-400"
                >
                  No models to display
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as
                      | ColumnMeta
                      | undefined;
                    const align = meta?.align;
                    const isModel = cell.column.id === "modelName";
                    const cellClass = isModel
                      ? "text-white"
                      : align === "right"
                      ? "text-right tabular-nums text-white"
                      : "text-white";
                    return (
                      <TableCell key={cell.id} className={cellClass}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
