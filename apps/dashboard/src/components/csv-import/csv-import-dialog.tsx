'use client';

import type { CsvEncoding, CsvImportEntity, CsvRowError } from '@app/shared';
import {
  applyCsvMapping,
  CSV_IMPORT_BATCH_SIZE,
  CSV_IMPORT_MAX_ROWS,
  CSV_IMPORT_PREVIEW_ROWS,
  CSV_IMPORT_SPECS,
  csvErrorReport,
  csvTemplate,
  decodeCsvBytes,
  parseCsv,
  suggestCsvMapping,
  validateCsvRows,
} from '@app/shared';
import { Download, FileUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ChangeEvent } from 'react';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { finishCsvImportAction, importCsvBatchAction } from '@/app/actions/csv-import';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

import { downloadText } from './download';

type Props = {
  slug: string;
  entity: CsvImportEntity;
  /** Categories de lieux (import de lieux) : correspondance par cle ou libelle. */
  placeCategories?: readonly { id: string; key: string; label: string }[];
  triggerLabel?: string;
};

type FileState = {
  name: string;
  encoding: CsvEncoding;
  headers: string[];
  rows: Record<string, string>[];
};
type Report = { created: number; updated: number; errors: CsvRowError[] };

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;
const validLines = (n: number) => `${n} ligne${n > 1 ? 's' : ''} valide${n > 1 ? 's' : ''}`;

/** Import CSV en 4 etapes : fichier, correspondance des colonnes, apercu valide, import par lots. */
export function CsvImportDialog({
  slug,
  entity,
  placeCategories = [],
  triggerLabel = 'Importer un CSV',
}: Props) {
  const spec = CSV_IMPORT_SPECS[entity];
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState<FileState | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  const reset = () => {
    setFile(null);
    setMapping({});
    setError(null);
    setProgress(null);
    setReport(null);
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    e.target.value = '';
    reset();
    if (!selected) return;
    const { text, encoding } = decodeCsvBytes(new Uint8Array(await selected.arrayBuffer()));
    const table = parseCsv(text);
    if (table.headers.length === 0 || table.rows.length === 0)
      return setError(
        'Fichier vide ou illisible : CSV attendu, avec une ligne d’en-têtes (séparateur « ; » ou « , »).',
      );
    if (table.rows.length > CSV_IMPORT_MAX_ROWS)
      return setError(
        `Le fichier contient ${table.rows.length} lignes : ${CSV_IMPORT_MAX_ROWS} au plus par import.`,
      );
    setFile({ name: selected.name, encoding, ...table });
    setMapping(suggestCsvMapping(entity, table.headers));
  };

  const mapped = useMemo(() => (file ? applyCsvMapping(file.rows, mapping) : []), [file, mapping]);
  const validation = useMemo(
    () => validateCsvRows(entity, mapped, { placeCategories }),
    [entity, mapped, placeCategories],
  );
  const missing = spec.columns.filter((c) => c.required && !mapping[c.key]).map((c) => c.label);
  const errorLines = new Set(validation.errors.map((e) => e.line));
  const toGeocode = validation.valid.filter((v) => v.geocode !== null).length;
  const shownColumns = spec.columns.filter((c) => mapping[c.key]);

  const submit = () =>
    startTransition(async () => {
      const rows = validation.valid.map((v) => ({
        line: v.line,
        values: mapped[v.line - 2] ?? {},
      }));
      const total: Report = { created: 0, updated: 0, errors: [...validation.errors] };
      for (let i = 0; i < rows.length; i += CSV_IMPORT_BATCH_SIZE) {
        setProgress(`Import en cours : ${i} / ${rows.length} lignes…`);
        const r = await importCsvBatchAction(
          slug,
          entity,
          rows.slice(i, i + CSV_IMPORT_BATCH_SIZE),
        );
        if (!r.ok) {
          toast.error(r.message);
          break;
        }
        total.created += r.data.created;
        total.updated += r.data.updated;
        total.errors.push(...r.data.errors);
      }
      total.errors.sort((a, b) => a.line - b.line);
      await finishCsvImportAction(slug, entity, {
        created: total.created,
        updated: total.updated,
        errors: new Set(total.errors.map((e) => e.line)).size,
      });
      setProgress(null);
      setReport(total);
      if (total.created + total.updated > 0) {
        toast.success(`${plural(total.created, 'élément')} importé${total.created > 1 ? 's' : ''}`);
        router.refresh();
      }
    });

  const errorsToShow = report ? report.errors : validation.errors;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileUp aria-hidden="true" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogTitle>Importer : {spec.label.toLowerCase()} (CSV)</DialogTitle>
        <DialogDescription>
          {CSV_IMPORT_MAX_ROWS} lignes au plus, séparateur « ; » ou « , ». Colonnes obligatoires :{' '}
          {spec.columns
            .filter((c) => c.required)
            .map((c) => c.label)
            .join(', ')}
          .
        </DialogDescription>

        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label htmlFor={`csv-fichier-${entity}`}>Fichier CSV</Label>
            <input
              id={`csv-fichier-${entity}`}
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              className="block text-sm"
              disabled={pending}
            />
          </div>
          <Button
            type="button"
            variant="link"
            className="px-0"
            onClick={() => downloadText(spec.filename, csvTemplate(entity))}
          >
            <Download aria-hidden="true" />
            Télécharger le modèle CSV
          </Button>
        </div>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        {file?.encoding === 'windows-1252' ? (
          <p
            role="status"
            className="rounded-md border border-amber-600 bg-amber-50 p-2 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-50"
          >
            Attention : fichier encodé en Windows-1252 (export Excel). Les accents ont été convertis
            ; vérifiez l’aperçu. Pour éviter cet avertissement, enregistrez le fichier au format «
            CSV UTF-8 ».
          </p>
        ) : null}

        {file && !report ? (
          <>
            <fieldset className="grid gap-3 sm:grid-cols-3">
              <legend className="mb-2 text-sm font-medium">
                Correspondance des colonnes de « {file.name} »
              </legend>
              {spec.columns.map((c) => (
                <div key={c.key} className="space-y-1">
                  <Label htmlFor={`csv-${entity}-${c.key}`}>
                    {c.label}
                    {c.required ? <span aria-hidden="true"> *</span> : null}
                    {c.required ? <span className="sr-only"> (obligatoire)</span> : null}
                  </Label>
                  <select
                    id={`csv-${entity}-${c.key}`}
                    value={mapping[c.key] ?? ''}
                    onChange={(e) => setMapping({ ...mapping, [c.key]: e.target.value })}
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                  >
                    <option value="">— Aucune —</option>
                    {file.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </fieldset>

            {missing.length ? (
              <p role="alert" className="text-destructive text-sm">
                Colonne obligatoire non associée : {missing.join(', ')}.
              </p>
            ) : (
              <p role="status" className="text-sm">
                <strong>{validLines(validation.valid.length)}</strong>,{' '}
                {plural(errorLines.size, 'ligne')} en erreur sur {file.rows.length}
                {toGeocode
                  ? ` ; ${plural(toGeocode, 'adresse')} sans coordonnées ${toGeocode > 1 ? 'seront géolocalisées' : 'sera géolocalisée'}`
                  : ''}
                .
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <caption className="text-muted-foreground mb-1 text-left text-sm">
                  Aperçu des {Math.min(CSV_IMPORT_PREVIEW_ROWS, file.rows.length)} premières lignes
                  (toutes les lignes sont vérifiées)
                </caption>
                <thead>
                  <tr className="border-b text-left">
                    <th scope="col" className="px-1 py-1">
                      Ligne
                    </th>
                    <th scope="col" className="px-1 py-1">
                      État
                    </th>
                    {shownColumns.map((c) => (
                      <th key={c.key} scope="col" className="px-1 py-1">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mapped.slice(0, CSV_IMPORT_PREVIEW_ROWS).map((r, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-1 py-1">{i + 2}</td>
                      <td
                        className={
                          errorLines.has(i + 2)
                            ? 'text-destructive px-1 py-1 font-medium'
                            : 'px-1 py-1'
                        }
                      >
                        {errorLines.has(i + 2) ? 'Erreur' : 'Valide'}
                      </td>
                      {shownColumns.map((c) => (
                        <td key={c.key} className="max-w-40 truncate px-1 py-1">
                          {r[c.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {report ? (
          <p role="status" className="text-sm font-medium">
            Import terminé : {plural(report.created, 'élément')} créé{report.created > 1 ? 's' : ''}
            {report.updated ? `, ${report.updated} mis à jour` : ''},{' '}
            {plural(new Set(report.errors.map((e) => e.line)).size, 'ligne')} en erreur.
          </p>
        ) : null}
        {progress ? (
          <p role="status" aria-live="polite" className="text-sm">
            {progress}
          </p>
        ) : null}

        {file && !missing.length && errorsToShow.length ? (
          <section aria-labelledby={`csv-erreurs-${entity}`} className="space-y-2">
            <h3 id={`csv-erreurs-${entity}`} className="text-sm font-medium">
              Erreurs ({errorsToShow.length})
            </h3>
            <ul className="text-destructive max-h-40 list-inside list-disc overflow-y-auto text-sm">
              {errorsToShow.slice(0, 100).map((e, i) => (
                <li key={`${e.line}-${i}`}>
                  Ligne {e.line} : {e.message}
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => downloadText(`erreurs-${spec.filename}`, csvErrorReport(errorsToShow))}
            >
              <Download aria-hidden="true" />
              Télécharger le rapport d’erreurs (CSV)
            </Button>
          </section>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fermer
          </Button>
          {!report ? (
            <Button
              onClick={submit}
              disabled={pending || !file || missing.length > 0 || validation.valid.length === 0}
            >
              {pending ? 'Import en cours…' : `Importer ${validLines(validation.valid.length)}`}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
