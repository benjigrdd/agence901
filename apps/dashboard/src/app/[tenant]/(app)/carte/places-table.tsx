'use client';

import type { GeoPoint } from '@app/shared';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';

import { DataTable } from '@/components/data-table';

export type PlaceRow = { id: string; name: string; category: string; color: string; address: string; source: string; accessibility: string; point: GeoPoint };

export function PlacesTable({ slug, rows }: { slug: string; rows: PlaceRow[] }) {
  const columns: ColumnDef<PlaceRow>[] = [
    {
      accessorKey: 'name',
      header: 'Nom',
      cell: ({ row }) => (
        <Link href={`/${slug}/carte/${row.original.id}`} className="font-medium underline-offset-4 hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    { accessorKey: 'category', header: 'Catégorie' },
    { accessorKey: 'address', header: 'Adresse' },
    { accessorKey: 'accessibility', header: 'Accessibilité' },
    { accessorKey: 'source', header: 'Source' },
  ];
  return <DataTable columns={columns} data={rows} caption="Liste des lieux" searchLabel="Rechercher un lieu" emptyMessage="Aucun lieu." getRowId={(r) => r.id} />;
}
