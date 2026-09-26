'use client';

import { formatNumberFr } from '@app/shared';
import type { ColumnDef } from '@tanstack/react-table';
import { TriangleAlert } from 'lucide-react';
import Link from 'next/link';

import { DataTable } from '@/components/data-table';
import type { TenantUsageRow } from '@/server/platform-usage';

const columns: ColumnDef<TenantUsageRow>[] = [
  {
    accessorKey: 'name',
    header: 'Commune',
    cell: ({ row }) => (
      <span className="inline-flex flex-wrap items-center gap-2">
        <Link href={`/admin/communes/${row.original.id}?onglet=usage`} className="font-medium underline-offset-4 hover:underline">
          {row.original.name}
        </Link>
        {row.original.lowActivity ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-xs text-amber-950">
            <TriangleAlert className="size-3" aria-hidden="true" />
            Commune peu active
          </span>
        ) : null}
      </span>
    ),
  },
  { accessorKey: 'installs', header: 'Installations', cell: ({ row }) => formatNumberFr(row.original.installs) },
  { accessorKey: 'activeUsers', header: 'Actifs (moyenne 30 j)', cell: ({ row }) => formatNumberFr(row.original.activeUsers) },
  { accessorKey: 'reportsCreated', header: 'Signalements créés' },
  { accessorKey: 'reportsResolved', header: 'Signalements résolus' },
  {
    accessorKey: 'averageResolutionDays',
    header: 'Délai moyen',
    cell: ({ row }) => (row.original.averageResolutionDays === null ? '—' : `${formatNumberFr(row.original.averageResolutionDays)} j`),
  },
  { accessorKey: 'postsPublished', header: 'Contenus publiés' },
  { accessorKey: 'notificationsSent', header: 'Notifications envoyées' },
];

export function UsageTable({ rows }: { rows: TenantUsageRow[] }) {
  return <DataTable columns={columns} data={rows} caption="Usage par commune (« Commune peu active » : aucune publication depuis 14 jours)" searchLabel="Rechercher une commune" getRowId={(r) => r.id} />;
}
