"use client";

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ErrorCase } from '@/lib/types';

interface ErrorAnalysisTableProps {
  errors: ErrorCase[];
  models: string[];
}

export function ErrorAnalysisTable({ errors, models }: ErrorAnalysisTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [errorTypeFilter, setErrorTypeFilter] = useState<string>('all');

  // Apply manual filters
  const filteredData = useMemo(() => {
    return errors.filter(e => {
      if (modelFilter !== 'all' && e.modelName !== modelFilter) return false;
      if (tierFilter !== 'all' && e.difficultyTier !== tierFilter) return false;
      if (errorTypeFilter !== 'all' && e.errorType !== errorTypeFilter) return false;
      return true;
    });
  }, [errors, modelFilter, tierFilter, errorTypeFilter]);

  const columns: ColumnDef<ErrorCase>[] = [
    {
      accessorKey: 'imagePath',
      header: 'Image',
      cell: ({ row }) => (
        <img
          src={`/${row.original.imagePath}`}
          alt={`${row.original.shoeBrand} ${row.original.shoeModel}`}
          className="h-16 w-16 object-cover rounded"
          loading="lazy"
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'shoeBrand',
      header: 'Brand',
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-white">{row.original.shoeBrand}</span>
      ),
    },
    {
      accessorKey: 'shoeModel',
      header: 'Model',
      enableSorting: true,
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate text-white" title={row.original.shoeModel}>
          {row.original.shoeModel}
        </div>
      ),
    },
    {
      accessorKey: 'difficultyTier',
      header: 'Tier',
      cell: ({ row }) => {
        const tier = row.original.difficultyTier;
        const colors: Record<string, string> = {
          easy: 'bg-green-600',
          medium: 'bg-yellow-600',
          hard: 'bg-red-600',
        };
        return <Badge className={colors[tier]}>{tier.toUpperCase()}</Badge>;
      },
    },
    {
      accessorKey: 'modelName',
      header: 'Vision Model',
      cell: ({ row }) => (
        <span className="text-sm text-white">
          {row.original.modelName.split('/').pop()}
        </span>
      ),
    },
    {
      accessorKey: 'errorType',
      header: 'Error',
      cell: ({ row }) => (
        <Badge variant={row.original.errorType === 'wrong' ? 'destructive' : 'secondary'}>
          {row.original.errorType === 'wrong' ? 'WRONG' : 'BRAND ONLY'}
        </Badge>
      ),
    },
    {
      accessorKey: 'visionResponse',
      header: 'Model Said',
      cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="max-w-[200px] text-sm text-white truncate cursor-help">
                {row.original.visionResponse}
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[400px] whitespace-pre-wrap bg-neutral-800 text-white border-neutral-700">
              <p className="text-sm">{row.original.visionResponse}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="space-y-4">
      {/* Filter controls */}
      <div className="flex flex-wrap gap-4">
        <Select value={modelFilter} onValueChange={setModelFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Models</SelectItem>
            {models.map(m => (
              <SelectItem key={m} value={m}>{m.split('/').pop()}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Filter by tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>

        <Select value={errorTypeFilter} onValueChange={setErrorTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Error type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Errors</SelectItem>
            <SelectItem value="wrong">Wrong</SelectItem>
            <SelectItem value="brand_only">Brand Only</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-neutral-400 self-center">
          {filteredData.length} errors
        </span>
      </div>

      {/* Table */}
      <div className="rounded-md border border-neutral-800">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={`text-neutral-300 ${header.column.getCanSort() ? 'cursor-pointer hover:bg-neutral-800' : ''}`}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() && (
                      <span className="ml-1">
                        {header.column.getIsSorted() === 'asc' ? '\u2191' : '\u2193'}
                      </span>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-neutral-400">
                  No errors found with current filters
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
