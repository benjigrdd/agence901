'use client';

import type { GeoPoint, ReportPriority, ReportStatus } from '@app/shared';
import { REPORT_PRIORITY_RANK } from '@app/shared';
import type { ColumnDef } from '@tanstack/react-table';
import { AlarmClock } from 'lucide-react';
import Link from 'next/link';

import { DataTable } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';

export type ReportRow = {
  id: string;
  reference: string;
  category: string;
  address: string;
  status: ReportStatus;
  priority: ReportPriority;
  priorityLabel: string;
  service: string;
  ageDays: number;
  overdue: boolean;
  createdLabel: string;
  point: GeoPoint;
};

export function OverdueBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-900">
      <AlarmClock className="size-3" aria-hidden="true" />
      En retard
    </span>
  );
}

export function ReportsTable({ slug, rows }: { slug: string; rows: ReportRow[] }) {
  const columns: ColumnDef<ReportRow>[] = [
    {
      accessorKey: 'reference',
      header: 'Référence',
      cell: ({ row }) => (
        <Link href={`/${slug}/signalements/${row.original.id}`} className="font-medium underline-offset-4 hover:underline">
          {row.original.reference}
        </Link>
      ),
    },
    { accessorKey: 'category', header: 'Catégorie' },
    { accessorKey: 'address', header: 'Adresse' },
    { accessorKey: 'status', header: 'Statut', cell: ({ row }) => <StatusBadge kind="report" status={row.original.status} /> },
    {
      id: 'priority',
      accessorFn: (r) => REPORT_PRIORITY_RANK[r.priority],
      header: 'Priorité',
      cell: ({ row }) => row.original.priorityLabel,
    },
    { accessorKey: 'service', header: 'Service' },
    {
      accessorKey: 'ageDays',
      header: 'Âge',
      cell: ({ row }) => (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          {row.original.ageDays} j{row.original.overdue ? <OverdueBadge /> : null}
        </span>
      ),
    },
    { accessorKey: 'createdLabel', header: 'Créé le', enableSorting: false },
  ];
  return (
    <DataTable
      columns={columns}
      data={rows}
      caption="Liste des signalements, triés par priorité puis ancienneté"
      searchLabel="Rechercher un signalement"
      emptyMessage="Aucun signalement ne correspond aux filtres."
      getRowId={(r) => r.id}
    />
  );
}
