'use client';

import type { ContentStatus } from '@app/shared';
import type { ColumnDef } from '@tanstack/react-table';
import { Pin } from 'lucide-react';
import Link from 'next/link';

import { DataTable } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';

export type PostRow = {
  id: string;
  title: string;
  typeLabel: string;
  status: ContentStatus;
  publication: string;
  author: string;
  updatedAt: string;
  updatedLabel: string;
  pinned: boolean;
};

export function PostsTable({ slug, rows }: { slug: string; rows: PostRow[] }) {
  const columns: ColumnDef<PostRow>[] = [
    {
      accessorKey: 'title',
      header: 'Titre',
      cell: ({ row }) => (
        <Link href={`/${slug}/actualites/${row.original.id}`} className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline">
          {row.original.pinned ? (
            <>
              <Pin className="size-3.5" aria-hidden="true" />
              <span className="sr-only">Épinglée : </span>
            </>
          ) : null}
          {row.original.title}
        </Link>
      ),
    },
    { accessorKey: 'typeLabel', header: 'Type' },
    { accessorKey: 'status', header: 'Statut', cell: ({ row }) => <StatusBadge kind="content" status={row.original.status} /> },
    { accessorKey: 'publication', header: 'Publication', enableSorting: false },
    { accessorKey: 'author', header: 'Auteur' },
    { accessorKey: 'updatedAt', header: 'Dernière modification', cell: ({ row }) => row.original.updatedLabel },
  ];
  return <DataTable columns={columns} data={rows} caption="Liste des actualités" searchLabel="Rechercher une actualité" getRowId={(r) => r.id} />;
}
