'use client';

import type { ImportResult, OsmPreview } from '@app/data';
import { OSM_CATEGORY_KEYS } from '@app/shared';
import { Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { CsvImportDialog } from '@/components/csv-import/csv-import-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { importIrveAction, importOsmAction, previewOsmAction } from './actions';

type Category = { id: string; key: string; label: string };

const DEFAULT_SELECTION = ['toilettes', 'fontaine', 'parc'];

const summary = (r: ImportResult) =>
  `${r.found} trouvé${r.found > 1 ? 's' : ''} : ${r.created} créé${r.created > 1 ? 's' : ''}, ${r.updated} mis à jour, ${r.skipped} ignoré${r.skipped > 1 ? 's' : ''}`;

/** Import OpenStreetMap : choix des categories, apercu du nombre de lieux, puis import. */
function OsmImportDialog({ slug, categories }: { slug: string; categories: readonly Category[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const importable = categories.filter((c) => OSM_CATEGORY_KEYS.includes(c.key));
  const [selected, setSelected] = useState<string[]>(
    DEFAULT_SELECTION.filter((k) => importable.some((c) => c.key === k)),
  );
  const [preview, setPreview] = useState<OsmPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const label = (key: string) => categories.find((c) => c.key === key)?.label ?? key;

  const toggle = (key: string, checked: boolean) => {
    setSelected((s) => (checked ? [...s, key] : s.filter((k) => k !== key)));
    setPreview(null);
  };
  const runPreview = () =>
    startTransition(async () => {
      setError(null);
      const r = await previewOsmAction(slug, selected);
      if (r.ok) setPreview(r.data);
      else setError(r.message);
    });
  const runImport = () =>
    startTransition(async () => {
      setError(null);
      const r = await importOsmAction(slug, selected, preview?.previewId ?? null);
      if (r.ok) {
        setResult(r.data);
        toast.success(`OpenStreetMap : ${summary(r.data)}`);
        router.refresh();
      } else setError(r.message);
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setPreview(null);
          setResult(null);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download aria-hidden="true" />
          Importer depuis OpenStreetMap
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogTitle>Importer depuis OpenStreetMap</DialogTitle>
        <DialogDescription>
          Équipements situés dans la commune. Un nouvel import met à jour les lieux déjà importés,
          sauf ceux que vous avez détachés. Données © contributeurs OpenStreetMap, licence ODbL.
        </DialogDescription>
        {!result ? (
          <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-medium">Catégories à importer</legend>
            {importable.map((c) => (
              <label key={c.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={selected.includes(c.key)}
                  onChange={(e) => toggle(c.key, e.target.checked)}
                  disabled={pending}
                />
                {c.label}
              </label>
            ))}
          </fieldset>
        ) : null}
        {preview && !result ? (
          <div role="status" className="text-sm">
            <p className="font-medium">
              {preview.found} lieu{preview.found > 1 ? 'x' : ''} trouvé
              {preview.found > 1 ? 's' : ''} dans OpenStreetMap :
            </p>
            <ul className="list-inside list-disc">
              {selected.map((key) => (
                <li key={key}>
                  {label(key)} : {preview.byCategory[key] ?? 0}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {result ? (
          <div role="status" className="text-sm">
            <p className="font-medium">Import terminé — {summary(result)}.</p>
            <ul className="list-inside list-disc">
              {Object.entries(result.byCategory).map(([key, c]) => (
                <li key={key}>
                  {label(key)} : {c.created} créé{c.created > 1 ? 's' : ''}, {c.updated} mis à jour,{' '}
                  {c.skipped} ignoré{c.skipped > 1 ? 's' : ''}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fermer
          </Button>
          {!result && !preview ? (
            <Button onClick={runPreview} disabled={pending || selected.length === 0}>
              {pending ? 'Recherche…' : 'Voir le nombre de lieux'}
            </Button>
          ) : null}
          {!result && preview ? (
            <Button onClick={runImport} disabled={pending || preview.found === 0}>
              {pending
                ? 'Import en cours…'
                : `Importer ${preview.found} lieu${preview.found > 1 ? 'x' : ''}`}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Imports de lieux : OpenStreetMap, bornes de recharge (IRVE) et CSV. */
export function OpenDataActions({
  slug,
  categories,
}: {
  slug: string;
  categories: readonly Category[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const importIrve = () =>
    startTransition(async () => {
      const r = await importIrveAction(slug);
      if (r.ok) {
        toast.success(`Bornes de recharge : ${summary(r.data)}`);
        router.refresh();
      } else toast.error(r.message);
    });
  return (
    <>
      <OsmImportDialog slug={slug} categories={categories} />
      <Button variant="outline" disabled={pending} onClick={importIrve}>
        <Download aria-hidden="true" />
        {pending ? 'Import des bornes…' : 'Importer les bornes de recharge'}
      </Button>
      <CsvImportDialog slug={slug} entity="places" placeCategories={categories} />
    </>
  );
}
