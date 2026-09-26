'use client';

import { formatNumberFr } from '@app/shared';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';

import { DataTable } from '@/components/data-table';

export type TenantRow = {
  id: string;
  slug: string;
  name: string;
  type: string;
  population: number;
  status: string;
  plan: string;
  modules: number;
  publication: string;
  lastActivity: string;
  lastActivityLabel: string;
};

const columns: ColumnDef<TenantRow>[] = [
  {
    accessorKey: 'name',
    header: 'Commune',
    cell: ({ row }) => (
      <Link href={`/admin/communes/${row.original.id}`} className="font-medium underline-offset-4 hover:underline">
        {row.original.name}
      </Link>
    ),
  },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'population', header: 'Habitants', cell: ({ row }) => formatNumberFr(row.original.population) },
  { accessorKey: 'status', header: 'Statut' },
  { accessorKey: 'plan', header: 'Offre' },
  { accessorKey: 'modules', header: 'Modules actifs' },
  { accessorKey: 'publication', header: 'Publication', enableSorting: false },
  { accessorKey: 'lastActivity', header: 'Dernière activité', cell: ({ row }) => row.original.lastActivityLabel },
  {
    id: 'open',
    header: 'Espace commune',
    enableSorting: false,
    cell: ({ row }) => (
      <Link href={`/${row.original.slug}`} className="underline-offset-4 hover:underline">
        Ouvrir<span className="sr-only"> l’espace de {row.original.name}</span>
      </Link>
    ),
  },
];

export function TenantsTable({ rows }: { rows: TenantRow[] }) {
  return <DataTable columns={columns} data={rows} caption="Communes clientes" searchLabel="Rechercher une commune" getRowId={(r) => r.id} />;
}
