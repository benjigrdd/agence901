'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { DataTable } from '@/components/data-table';

export type NotificationRow = {
  id: string;
  title: string;
  target: string;
  date: string;
  dateLabel: string;
  recipients: number;
  opened: number;
  status: 'Envoyée' | 'Programmée';
  urgent: boolean;
};

export function NotificationsTable({ rows }: { rows: NotificationRow[] }) {
  const columns: ColumnDef<NotificationRow>[] = [
    { accessorKey: 'title', header: 'Titre', cell: ({ row }) => `${row.original.title}${row.original.urgent ? ' (urgente)' : ''}` },
    { accessorKey: 'target', header: 'Cible' },
    { accessorKey: 'date', header: 'Date', cell: ({ row }) => row.original.dateLabel },
    { accessorKey: 'recipients', header: 'Destinataires' },
    { accessorKey: 'opened', header: 'Ouvertures' },
    { accessorKey: 'status', header: 'Statut' },
  ];
  return <DataTable columns={columns} data={rows} caption="Historique des notifications" searchLabel="Rechercher une notification" getRowId={(r) => r.id} />;
}
