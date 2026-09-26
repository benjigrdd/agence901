'use client';

import type { ColumnDef, RowSelectionState, SortingState } from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useId, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type DataTableProps<T> = {
  columns: ColumnDef<T>[];
  data: T[];
  /** Legende lue par les lecteurs d'ecran. */
  caption: string;
  /** Active la recherche plein texte avec ce libelle. */
  searchLabel?: string;
  /** Filtres complementaires affiches dans la barre d'outils. */
  toolbar?: ReactNode;
  selectable?: boolean;
  onSelectionChange?: (rows: T[]) => void;
  loading?: boolean;
  pageSize?: number;
  emptyMessage?: string;
  getRowId?: (row: T) => string;
};

function selectionColumn<T>(): ColumnDef<T> {
  return {
    id: '__selection',
    enableSorting: false,
    header: ({ table }) => (
      <Checkbox
        aria-label="Tout sélectionner sur la page"
        checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? 'indeterminate' : false}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(value === true)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label="Sélectionner la ligne"
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(value === true)}
      />
    ),
  };
}

export function DataTable<T>({
  columns,
  data,
  caption,
  searchLabel,
  toolbar,
  selectable = false,
  onSelectionChange,
  loading = false,
  pageSize = 20,
  emptyMessage = 'Aucun résultat.',
  getRowId,
}: DataTableProps<T>) {
  const searchId = useId();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const allColumns = useMemo(() => (selectable ? [selectionColumn<T>(), ...columns] : columns), [selectable, columns]);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table gere son propre etat memoise.
  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: selectable,
    ...(getRowId ? { getRowId: (row: T) => getRowId(row) } : {}),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize } },
  });

  useEffect(() => {
    onSelectionChange?.(table.getSelectedRowModel().rows.map((r) => r.original));
  }, [rowSelection, onSelectionChange, table]);

  const pageCount = Math.max(1, table.getPageCount());
  const filteredCount = table.getFilteredRowModel().rows.length;

  return (
    <div className="space-y-3">
      {searchLabel || toolbar ? (
        <div className="flex flex-wrap items-end gap-3">
          {searchLabel ? (
            <div className="w-full max-w-xs space-y-1">
              <Label htmlFor={searchId}>{searchLabel}</Label>
              <Input
                id={searchId}
                type="search"
                value={globalFilter}
                onChange={(event) => {
                  setGlobalFilter(event.target.value);
                  table.setPageIndex(0);
                }}
              />
            </div>
          ) : null}
          {toolbar}
        </div>
      ) : null}

      <div className="rounded-md border">
        <Table>
          <TableCaption className="sr-only">{caption}</TableCaption>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();
                  const label = header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext());
                  return (
                    <TableHead
                      key={header.id}
                      scope="col"
                      aria-sort={canSort ? (sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none') : undefined}
                    >
                      {canSort ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-8"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {label}
                          {sorted === 'asc' ? (
                            <ArrowUp aria-hidden="true" />
                          ) : sorted === 'desc' ? (
                            <ArrowDown aria-hidden="true" />
                          ) : (
                            <ArrowUpDown aria-hidden="true" className="opacity-50" />
                          )}
                        </Button>
                      ) : (
                        label
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {allColumns.map((_c, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={allColumns.length} className="text-muted-foreground h-20 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted-foreground" aria-live="polite">
          {filteredCount} élément{filteredCount > 1 ? 's' : ''}
          {selectable && Object.keys(rowSelection).length > 0 ? ` · ${Object.keys(rowSelection).length} sélectionné(s)` : ''}
        </p>
        <nav aria-label="Pagination" className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft aria-hidden="true" />
            Précédent
          </Button>
          <span>
            Page {table.getState().pagination.pageIndex + 1} sur {pageCount}
          </span>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Suivant
            <ChevronRight aria-hidden="true" />
          </Button>
        </nav>
      </div>
    </div>
  );
}
