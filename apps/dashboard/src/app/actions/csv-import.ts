'use server';

import type { CsvImportCounts, DataContext, Repositories } from '@app/data';
import { ConflictError, isDataError } from '@app/data';
import type {
  CsvImportEntity,
  CsvImportValue,
  CsvRowError,
  CsvValidRow,
  Place,
  PlaceInput,
} from '@app/shared';
import { CSV_IMPORT_BATCH_SIZE, CSV_IMPORT_ENTITIES, validateCsvRows } from '@app/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import type { ActionResult } from '@/server/errors';
import { runAction } from '@/server/errors';
import { geocodeBatch } from '@/server/geocoding';
import { requireTenant } from '@/server/guards';
import { getRepos } from '@/server/repos';

export type CsvBatchResult = { created: number; updated: number; errors: CsvRowError[] };

const BatchSchema = z.object({
  entity: z.enum(CSV_IMPORT_ENTITIES),
  rows: z
    .array(
      z.object({
        line: z.number().int().min(2),
        values: z.record(z.string(), z.string().max(5000)),
      }),
    )
    .min(1)
    .max(CSV_IMPORT_BATCH_SIZE),
});

const PATHS: Record<CsvImportEntity, string> = {
  places: 'carte',
  events: 'agenda',
  procedures: 'demarches',
  sortingGuide: 'environnement',
};

const message = (error: unknown) => (isDataError(error) ? error.message : 'ligne non enregistrée');

/** Ecrit les lignes valides une par une : une erreur n'interrompt pas le lot. */
async function writeRows<T>(
  rows: CsvValidRow<T>[],
  write: (row: CsvValidRow<T>) => Promise<'created' | 'updated'>,
  out: CsvBatchResult,
) {
  for (const row of rows) {
    try {
      out[await write(row)]++;
    } catch (error) {
      out.errors.push({ line: row.line, column: null, message: message(error) });
    }
  }
}

/** Positions des adresses sans coordonnees (API Adresse, score ≥ 0,6) ; sinon « Adresse non trouvée ». */
async function geocodeRows<T>(
  rows: CsvValidRow<T>[],
  inseeCode: string,
  apply: (value: T, point: { lat: number; lng: number }) => T,
  out: CsvBatchResult,
): Promise<CsvValidRow<T>[]> {
  const pending = rows.filter((r) => r.geocode !== null);
  if (pending.length === 0) return rows;
  const found = await geocodeBatch(
    pending.map((r) => ({ id: String(r.line), address: r.geocode ?? '' })),
    inseeCode,
  );
  return rows.flatMap((r) => {
    if (r.geocode === null) return [r];
    const point = found.get(String(r.line));
    if (!point) {
      out.errors.push({ line: r.line, column: 'Adresse', message: 'Adresse non trouvée' });
      return [];
    }
    return [{ ...r, value: apply(r.value, point), geocode: null }];
  });
}

async function allPlaces(repos: Repositories, ctx: DataContext): Promise<Place[]> {
  const items: Place[] = [];
  for (let page = 1; ; page++) {
    const result = await repos.places.list(ctx, { page, pageSize: 1000 });
    items.push(...result.items);
    if (items.length >= result.total || result.items.length === 0) return items;
  }
}

/**
 * Importe un lot de 200 lignes au plus (valeurs par champ, apres correspondance des colonnes). Les
 * lignes sont revalidees ici (zod) : l'apercu du navigateur n'est qu'une aide.
 */
export async function importCsvBatchAction(
  slug: string,
  entity: CsvImportEntity,
  rows: { line: number; values: Record<string, string> }[],
): Promise<ActionResult<CsvBatchResult>> {
  return runAction(async () => {
    const batch = BatchSchema.parse({ entity, rows });
    const { ctx, tenant } = await requireTenant(slug);
    const repos = getRepos();
    const out: CsvBatchResult = { created: 0, updated: 0, errors: [] };
    const placeCategories =
      batch.entity === 'places' || batch.entity === 'events'
        ? await repos.placeCategories.list(ctx)
        : [];
    const validate = <E extends CsvImportEntity>(e: E) => {
      const valid: CsvValidRow<CsvImportValue<E>>[] = [];
      for (const row of batch.rows) {
        const result = validateCsvRows(e, [row.values], { placeCategories }, row.line);
        valid.push(...result.valid);
        out.errors.push(...result.errors);
      }
      return valid;
    };

    switch (batch.entity) {
      case 'places': {
        const rows = await geocodeRows(
          validate('places'),
          tenant.inseeCode,
          (v, point): PlaceInput => ({ ...v, point }),
          out,
        );
        // Idempotence : `identifiant_externe` → mise a jour du lieu CSV existant (jamais d'un lieu detache).
        const existing = new Map(
          (await allPlaces(repos, ctx))
            .filter((p) => p.source === 'csv' && p.externalId)
            .map((p) => [p.externalId, p]),
        );
        await writeRows(
          rows,
          async ({ value }) => {
            const current = value.externalId ? existing.get(value.externalId) : undefined;
            if (!current) {
              const created = await repos.places.create(ctx, value);
              if (created.externalId) existing.set(created.externalId, created);
              return 'created';
            }
            if (current.detached) throw new ConflictError('lieu détaché de l’import : non modifié');
            await repos.places.update(ctx, current.id, {
              ...value,
              photoMediaId: current.photoMediaId,
              accessibility: { ...value.accessibility, toilets: current.accessibility.toilets },
            });
            return 'updated';
          },
          out,
        );
        break;
      }
      case 'events': {
        const rows = await geocodeRows(
          validate('events'),
          tenant.inseeCode,
          (v, point) => (v.location ? { ...v, location: { ...v.location, point } } : v),
          out,
        );
        await writeRows(
          rows,
          async ({ value }) => (await repos.events.create(ctx, value), 'created'),
          out,
        );
        break;
      }
      case 'procedures': {
        let order = (await repos.procedures.list(ctx)).length;
        await writeRows(
          validate('procedures'),
          async ({ value }) => (
            await repos.procedures.create(ctx, { ...value, order: order++ }),
            'created'
          ),
          out,
        );
        break;
      }
      case 'sortingGuide':
        await writeRows(
          validate('sortingGuide'),
          async ({ value }) => (await repos.environment.sortingGuide.create(ctx, value), 'created'),
          out,
        );
        break;
    }
    out.errors.sort((a, b) => a.line - b.line);
    return out;
  });
}

/** Fin d'import : bilan dans le journal d'audit (`import_csv`) et rafraichissement de la page. */
export async function finishCsvImportAction(
  slug: string,
  entity: CsvImportEntity,
  counts: CsvImportCounts,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const parsed = z
      .object({
        entity: z.enum(CSV_IMPORT_ENTITIES),
        counts: z.object({
          created: z.number().int().min(0),
          updated: z.number().int().min(0),
          errors: z.number().int().min(0),
        }),
      })
      .parse({ entity, counts });
    const { ctx } = await requireTenant(slug);
    await getRepos().openData.recordCsvImport(ctx, parsed.entity, parsed.counts);
    revalidatePath(`/${slug}/${PATHS[parsed.entity]}`);
    return null;
  });
}
