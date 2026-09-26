'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';

import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

export type AuditRow = {
  id: string;
  at: string;
  atLabel: string;
  actor: string;
  action: string;
  entity: string;
  fields: string[];
  diff: { field: string; before: string; after: string }[];
};

export function AuditTable({ rows }: { rows: AuditRow[] }) {
  const [selected, setSelected] = useState<AuditRow | null>(null);
  const columns: ColumnDef<AuditRow>[] = [
    { accessorKey: 'at', header: 'Date', cell: ({ row }) => row.original.atLabel },
    { accessorKey: 'actor', header: 'Acteur' },
    { accessorKey: 'action', header: 'Action' },
    { accessorKey: 'entity', header: 'Élément' },
    { id: 'fields', accessorFn: (r) => r.fields.join(', '), header: 'Champs modifiés', enableSorting: false },
    {
      id: 'detail',
      header: () => <span className="sr-only">Détail</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <Button size="sm" variant="ghost" onClick={() => setSelected(row.original)}>
          Voir le détail<span className="sr-only"> du {row.original.atLabel}</span>
        </Button>
      ),
    },
  ];
  return (
    <>
      <DataTable columns={columns} data={rows} caption="Journal d’audit" searchLabel="Rechercher dans le journal" getRowId={(r) => r.id} />
      <Dialog open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogTitle>
            {selected?.action} · {selected?.entity}
          </DialogTitle>
          <DialogDescription>
            {selected?.atLabel} par {selected?.actor}
          </DialogDescription>
          <table className="w-full table-fixed text-xs">
            <caption className="sr-only">Valeurs avant et après modification</caption>
            <thead>
              <tr className="border-b text-left">
                <th scope="col" className="w-32 py-1">
                  Champ
                </th>
                <th scope="col">Avant</th>
                <th scope="col">Après</th>
              </tr>
            </thead>
            <tbody>
              {selected?.diff.map((d) => (
                <tr key={d.field} className="border-b align-top">
                  <th scope="row" className="py-1 text-left font-medium">
                    <mark className="rounded bg-amber-100 px-1 text-amber-950">{d.field}</mark>
                  </th>
                  <td>
                    <pre className="bg-muted overflow-x-auto rounded p-1 whitespace-pre-wrap">{d.before}</pre>
                  </td>
                  <td>
                    <pre className="overflow-x-auto rounded bg-green-50 p-1 whitespace-pre-wrap text-green-950">{d.after}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DialogContent>
      </Dialog>
    </>
  );
}
