'use client';

import type { ContentStatus } from '@app/shared';
import type { ColumnDef } from '@tanstack/react-table';
import { Repeat } from 'lucide-react';
import Link from 'next/link';

import { DataTable } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';

export type EventRow = {
  id: string;
  title: string;
  category: string;
  status: ContentStatus;
  startsAt: string;
  when: string;
  recurring: boolean;
  place: string;
};

export function EventsTable({ slug, rows }: { slug: string; rows: EventRow[] }) {
  const columns: ColumnDef<EventRow>[] = [
    {
      accessorKey: 'title',
      header: 'Événement',
      cell: ({ row }) => (
        <Link href={`/${slug}/agenda/${row.original.id}`} className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline">
          {row.original.title}
          {row.original.recurring ? (
            <>
              <Repeat className="size-3.5" aria-hidden="true" />
              <span className="sr-only"> (récurrent)</span>
            </>
          ) : null}
        </Link>
      ),
    },
    { accessorKey: 'startsAt', header: 'Date', cell: ({ row }) => row.original.when },
    { accessorKey: 'category', header: 'Catégorie' },
    { accessorKey: 'place', header: 'Lieu', enableSorting: false },
    { accessorKey: 'status', header: 'Statut', cell: ({ row }) => <StatusBadge kind="content" status={row.original.status} /> },
  ];
  return <DataTable columns={columns} data={rows} caption="Liste des événements" searchLabel="Rechercher un événement" getRowId={(r) => r.id} />;
}
