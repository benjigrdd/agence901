'use client';

import type { SortingBin } from '@app/shared';
import { SORTING_BIN_LABELS, SORTING_BINS } from '@app/shared';
import type { ColumnDef } from '@tanstack/react-table';
import { Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { removeSortingItemAction, saveSortingItemAction } from './actions';

type Item = { id: string; name: string; bin: SortingBin; advice: string };
type Draft = { id: string | null; name: string; bin: SortingBin; advice: string };

export function SortingGuideManager({ slug, canEdit, items }: { slug: string; canEdit: boolean; items: Item[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const columns: ColumnDef<Item>[] = [
    { accessorKey: 'name', header: 'Objet' },
    { id: 'bin', accessorFn: (i) => SORTING_BIN_LABELS[i.bin], header: 'Bac ou filière' },
    { accessorKey: 'advice', header: 'Conseil', enableSorting: false },
    ...(canEdit
      ? [
          {
            id: 'actions',
            header: () => <span className="sr-only">Actions</span>,
            enableSorting: false,
            cell: ({ row }: { row: { original: Item } }) => (
              <span className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setDraft({ ...row.original })}>
                  Modifier<span className="sr-only"> {row.original.name}</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    startTransition(async () => {
                      const r = await removeSortingItemAction(slug, row.original.id);
                      if (r.ok) {
                        toast.success('Consigne supprimée');
                        router.refresh();
                      } else toast.error(r.message);
                    })
                  }
                >
                  Supprimer<span className="sr-only"> {row.original.name}</span>
                </Button>
              </span>
            ),
          } satisfies ColumnDef<Item>,
        ]
      : []),
  ];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const { id, ...input } = draft;
    startTransition(async () => {
      const r = await saveSortingItemAction(slug, id, { ...input, name: input.name.trim(), advice: input.advice.trim() });
      if (r.ok) {
        toast.success('Consigne enregistrée');
        setDraft(null);
        setErrors({});
        router.refresh();
      } else {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.message);
      }
    });
  };

  return (
    <div className="space-y-4">
      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setDraft({ id: null, name: '', bin: 'recycling', advice: '' })}>Ajouter une consigne</Button>
          <Button variant="outline" disabled aria-describedby="import-bientot">
            <Upload aria-hidden="true" />
            Importer un CSV
          </Button>
          <span id="import-bientot" className="text-muted-foreground self-center text-sm">
            Bientôt disponible
          </span>
        </div>
      ) : null}
      {draft ? (
        <form onSubmit={submit} noValidate className="grid gap-3 rounded-lg border p-4 md:grid-cols-3" aria-label="Consigne de tri">
          <div className="space-y-1">
            <Label htmlFor="tri-nom">Objet</Label>
            <Input id="tri-nom" value={draft.name} maxLength={80} aria-invalid={errors.name ? true : undefined} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            {errors.name ? <p role="alert" className="text-destructive text-sm">{errors.name}</p> : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="tri-bac">Bac ou filière</Label>
            <select id="tri-bac" value={draft.bin} onChange={(e) => setDraft({ ...draft, bin: SORTING_BINS.find((b) => b === e.target.value) ?? 'other' })} className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm">
              {SORTING_BINS.map((b) => (
                <option key={b} value={b}>
                  {SORTING_BIN_LABELS[b]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 md:col-span-3">
            <Label htmlFor="tri-conseil">Conseil</Label>
            <Textarea id="tri-conseil" value={draft.advice} maxLength={300} aria-invalid={errors.advice ? true : undefined} onChange={(e) => setDraft({ ...draft, advice: e.target.value })} />
            {errors.advice ? <p role="alert" className="text-destructive text-sm">{errors.advice}</p> : null}
          </div>
          <div className="flex gap-2 md:col-span-3">
            <Button type="submit" disabled={pending}>
              Enregistrer
            </Button>
            <Button type="button" variant="outline" onClick={() => setDraft(null)}>
              Annuler
            </Button>
          </div>
        </form>
      ) : null}
      <DataTable columns={columns} data={items} caption="Consignes de tri" searchLabel="Rechercher un objet" getRowId={(i) => i.id} />
    </div>
  );
}
