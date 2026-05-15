"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingFn,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
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
// Stable numeric sort comparator.
//
// - PITFALLS Pitfall 1: ties fall back to localeCompare on modelName so
//   tied rows preserve deterministic order across re-sorts.
// - PITFALLS Pitfall 3: null/undefined are explicitly branched — no
//   NaN/undefined ever reaches the `<` operator. `sortUndefined: 'last'`
//   on each column ensures TanStack-level handling, this comparator is
//   the defensive second layer.
// ---------------------------------------------------------------------------

const stableNumericSort: SortingFn<ModelRow> = (rowA, rowB, columnId) => {
  const a = rowA.getValue(columnId) as number | null | undefined;
  const b = rowB.getValue(columnId) as number | null | undefined;
  const an = a == null ? null : a;
  const bn = b == null ? null : b;
  if (an === bn) {
    return rowA.original.modelName.localeCompare(rowB.original.modelName);
  }
  if (an === null) return 1;
  if (bn === null) return -1;
  return an < bn ? -1 : 1;
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
    enableSorting: true,
    sortDescFirst: false, // A→Z first
    sortingFn: "alphanumeric",
  },
  {
    accessorKey: "overallAccuracy",
    header: "Accuracy %",
    cell: ({ getValue }) => formatPercent(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
    enableSorting: true,
    sortDescFirst: true, // high is best
    sortingFn: stableNumericSort,
    sortUndefined: "last" as const,
  },
  {
    accessorKey: "exactMatches",
    header: "Exact",
    cell: ({ getValue }) => formatInt(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
    enableSorting: true,
    sortDescFirst: true, // high is best
    sortingFn: stableNumericSort,
    sortUndefined: "last" as const,
  },
  {
    accessorKey: "variantMatches",
    header: "Variant",
    cell: ({ getValue }) => formatInt(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
    enableSorting: true,
    sortDescFirst: true, // high is best
    sortingFn: stableNumericSort,
    sortUndefined: "last" as const,
  },
  {
    accessorKey: "brandOnlyMatches",
    header: "Brand-only",
    cell: ({ getValue }) => formatInt(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
    enableSorting: true,
    sortDescFirst: false, // low is best
    sortingFn: stableNumericSort,
    sortUndefined: "last" as const,
  },
  {
    accessorKey: "wrongMatches",
    header: "Wrong",
    cell: ({ getValue }) => formatInt(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
    enableSorting: true,
    sortDescFirst: false, // low is best
    sortingFn: stableNumericSort,
    sortUndefined: "last" as const,
  },
  {
    accessorKey: "easyAccuracy",
    header: "Easy %",
    cell: ({ getValue }) => formatPercent(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
    enableSorting: true,
    sortDescFirst: true, // high is best
    sortingFn: stableNumericSort,
    sortUndefined: "last" as const,
  },
  {
    accessorKey: "mediumAccuracy",
    header: "Medium %",
    cell: ({ getValue }) => formatPercent(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
    enableSorting: true,
    sortDescFirst: true, // high is best
    sortingFn: stableNumericSort,
    sortUndefined: "last" as const,
  },
  {
    accessorKey: "hardAccuracy",
    header: "Hard %",
    cell: ({ getValue }) => formatPercent(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
    enableSorting: true,
    sortDescFirst: true, // high is best
    sortingFn: stableNumericSort,
    sortUndefined: "last" as const,
  },
  {
    accessorKey: "totalCost",
    header: "Total Cost",
    cell: ({ getValue }) => formatTotalCost(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
    enableSorting: true,
    sortDescFirst: false, // low is best
    sortingFn: stableNumericSort,
    sortUndefined: "last" as const,
  },
  {
    accessorKey: "costPerCorrect",
    header: "Cost / Correct",
    cell: ({ getValue }) => formatCostPerCorrect(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
    enableSorting: true,
    sortDescFirst: false, // low is best
    sortingFn: stableNumericSort,
    sortUndefined: "last" as const,
  },
  {
    accessorKey: "avgLatency",
    header: "Avg Latency",
    cell: ({ getValue }) => formatLatencyMs(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
    enableSorting: true,
    sortDescFirst: false, // low is best
    sortingFn: stableNumericSort,
    sortUndefined: "last" as const,
  },
  {
    accessorKey: "inputTokensTotal",
    header: "Input Tokens",
    cell: ({ getValue }) => formatInt(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
    enableSorting: true,
    sortDescFirst: false, // fewer is better (user-overridable)
    sortingFn: stableNumericSort,
    sortUndefined: "last" as const,
  },
  {
    accessorKey: "outputTokensTotal",
    header: "Output Tokens",
    cell: ({ getValue }) => formatInt(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
    enableSorting: true,
    sortDescFirst: false, // fewer is better (user-overridable)
    sortingFn: stableNumericSort,
    sortUndefined: "last" as const,
  },
  {
    accessorKey: "tokensPerShoe",
    header: "Tokens / Shoe",
    cell: ({ getValue }) => formatInt(getValue() as number | null),
    meta: { align: "right" } satisfies ColumnMeta,
    enableSorting: true,
    sortDescFirst: false, // fewer is better (user-overridable)
    sortingFn: stableNumericSort,
    sortUndefined: "last" as const,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ResultsTable({ rows }: { rows: ModelRow[] }) {
  // Default sort locked per D-08 / VIZR-11: overallAccuracy desc.
  const [sorting, setSorting] = useState<SortingState>([
    { id: "overallAccuracy", desc: true },
  ]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Three-state cycle per click (asc → desc → unsorted). enableSortingRemoval
    // defaults to true; pairing with enableMultiSort: false gives the cycle
    // described in CONTEXT.md "Default sort and behavior".
    enableMultiSort: false,
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
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();
                  const baseClass = isModel
                    ? "text-neutral-300"
                    : align === "right"
                    ? "text-neutral-300 text-right"
                    : "text-neutral-300";
                  const sortClass = canSort
                    ? " cursor-pointer select-none hover:bg-neutral-800"
                    : "";
                  // Right-aligned headers put the chevron on the LEFT of the
                  // label so the numeric value stays right-anchored.
                  const flexClass =
                    align === "right"
                      ? "flex items-center justify-end gap-1"
                      : "flex items-center gap-1";
                  return (
                    <TableHead
                      key={header.id}
                      className={baseClass + sortClass}
                      onClick={
                        canSort
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                    >
                      {header.isPlaceholder ? null : (
                        <div className={flexClass}>
                          <span>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </span>
                          {canSort &&
                            (sortDir === "asc" ? (
                              <ChevronUp
                                className="h-3.5 w-3.5"
                                aria-hidden
                              />
                            ) : sortDir === "desc" ? (
                              <ChevronDown
                                className="h-3.5 w-3.5"
                                aria-hidden
                              />
                            ) : (
                              <ChevronsUpDown
                                className="h-3.5 w-3.5 opacity-40"
                                aria-hidden
                              />
                            ))}
                        </div>
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
