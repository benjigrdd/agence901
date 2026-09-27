/**
 * Import CSV generique (dashboard) : colonnes attendues par entite, correspondance automatique,
 * validation zod ligne par ligne et modeles telechargeables. Utilise cote client (apercu) ET cote
 * serveur (revalidation avant ecriture).
 */
import { normalizeHeader, toCsv } from './csv';
import type {
  EventCategory,
  ProcedureCategory,
  ProcedureKind,
  SortingBin,
  WheelchairAccess,
} from './enums';
import {
  EVENT_CATEGORIES,
  PROCEDURE_CATEGORIES,
  PROCEDURE_KINDS,
  SORTING_BINS,
  WHEELCHAIR_ACCESS,
} from './enums';
import { parisInputToIso } from './format-date';
import {
  EVENT_CATEGORY_LABELS,
  PROCEDURE_CATEGORY_LABELS,
  PROCEDURE_KIND_LABELS,
  SORTING_BIN_LABELS,
  WHEELCHAIR_ACCESS_LABELS,
} from './i18n/fr';
import type { EventInput, PlaceInput, ProcedureInput, SortingGuideItemInput } from './schemas';
import {
  EventInputSchema,
  PlaceInputSchema,
  ProcedureInputSchema,
  richTextFromPlainText,
  SortingGuideItemInputSchema,
} from './schemas';

export const CSV_IMPORT_ENTITIES = ['places', 'events', 'procedures', 'sortingGuide'] as const;
export type CsvImportEntity = (typeof CSV_IMPORT_ENTITIES)[number];

export const CSV_IMPORT_MAX_ROWS = 2000;
export const CSV_IMPORT_BATCH_SIZE = 200;
export const CSV_IMPORT_PREVIEW_ROWS = 20;

export type CsvImportColumn = {
  key: string;
  /** En-tete du modele telechargeable. */
  header: string;
  label: string;
  required: boolean;
  /** Noms de colonnes reconnus (normalises, voir `normalizeHeader`). */
  aliases: string[];
  example: string;
};

type Values = {
  places: PlaceInput;
  events: EventInput;
  procedures: ProcedureInput;
  sortingGuide: SortingGuideItemInput;
};
export type CsvImportValue<E extends CsvImportEntity> = Values[E];

/** Ligne valide. `geocode` : adresse a geocoder cote serveur (la position fournie est provisoire). */
export type CsvValidRow<T> = { line: number; value: T; geocode: string | null };
export type CsvRowError = { line: number; column: string | null; message: string };
export type CsvValidation<T> = { valid: CsvValidRow<T>[]; errors: CsvRowError[] };

export type CsvImportContext = {
  placeCategories: readonly { id: string; key: string; label: string }[];
};

const col = (
  key: string,
  header: string,
  label: string,
  example: string,
  aliases: string[] = [],
  required = false,
): CsvImportColumn => ({
  key,
  header,
  label,
  required,
  aliases: [
    ...new Set([normalizeHeader(header), normalizeHeader(label), key.toLowerCase(), ...aliases]),
  ],
  example,
});

export const CSV_IMPORT_SPECS: Record<
  CsvImportEntity,
  { label: string; filename: string; columns: CsvImportColumn[] }
> = {
  places: {
    label: 'Lieux',
    filename: 'modele-lieux.csv',
    columns: [
      col('name', 'nom', 'Nom', 'Médiathèque municipale', ['name', 'nom_du_lieu', 'libelle'], true),
      col('category', 'categorie', 'Catégorie', 'Culture', ['category', 'type'], true),
      col(
        'address',
        'adresse',
        'Adresse',
        '2 rue de la République',
        ['address', 'adresse_postale'],
        true,
      ),
      col('lat', 'latitude', 'Latitude', '47,3941', ['lat', 'y']),
      col('lng', 'longitude', 'Longitude', '0,6848', ['lng', 'lon', 'long', 'x']),
      col('openingHours', 'horaires', 'Horaires (format OSM)', 'Tu-Sa 10:00-18:00', [
        'opening_hours',
        'horaire',
      ]),
      col('phone', 'telephone', 'Téléphone', '02 47 00 00 00', ['phone', 'tel']),
      col('website', 'site_web', 'Site web', 'https://www.exemple.fr', ['website', 'site', 'url']),
      col('description', 'description', 'Description', 'Prêt de livres et de jeux.'),
      col('wheelchair', 'acces_fauteuil', 'Accès fauteuil', 'oui', [
        'wheelchair',
        'accessible',
        'accessibilite',
      ]),
      col('externalId', 'identifiant_externe', 'Identifiant externe', 'MEDIA-01', [
        'external_id',
        'identifiant',
        'id',
      ]),
    ],
  },
  events: {
    label: 'Événements',
    filename: 'modele-evenements.csv',
    columns: [
      col('title', 'titre', 'Titre', 'Fête de la musique', ['title', 'nom'], true),
      col(
        'startsAt',
        'debut',
        'Date de début',
        '21/06/2027 18:00',
        ['date_debut', 'date', 'start', 'starts_at'],
        true,
      ),
      col('endsAt', 'fin', 'Date de fin', '21/06/2027 23:30', ['date_fin', 'end', 'ends_at']),
      col('allDay', 'journee_entiere', 'Journée entière', 'non', ['all_day']),
      col('category', 'categorie', 'Catégorie', 'Culture', ['category', 'type']),
      col('description', 'description', 'Description', 'Concerts dans le centre-ville.'),
      col('location', 'lieu', 'Lieu', 'Place de la Mairie', ['location', 'adresse']),
      col('lat', 'latitude', 'Latitude', '', ['lat']),
      col('lng', 'longitude', 'Longitude', '', ['lng', 'lon']),
      col('organizer', 'organisateur', 'Organisateur', 'Comité des fêtes', ['organizer']),
      col('free', 'gratuit', 'Gratuit', 'oui', ['free']),
      col('price', 'tarif', 'Tarif', '', ['price', 'prix']),
      col('registrationUrl', 'inscription', 'Lien d’inscription', '', [
        'registration_url',
        'lien_inscription',
      ]),
      col('accessible', 'accessible_pmr', 'Accessible PMR', 'oui', ['accessible', 'pmr']),
    ],
  },
  procedures: {
    label: 'Démarches',
    filename: 'modele-demarches.csv',
    columns: [
      col('category', 'categorie', 'Catégorie', 'État civil', ['category', 'rubrique']),
      col('title', 'titre', 'Titre', 'Demander un acte de naissance', ['title', 'nom'], true),
      col(
        'description',
        'description',
        'Description',
        'Demande en ligne sur service-public.fr.',
        [],
        true,
      ),
      col('kind', 'type', 'Type (lien, téléphone ou email)', 'lien', ['kind']),
      col(
        'value',
        'valeur',
        'Lien, téléphone ou email',
        'https://www.service-public.fr/particuliers/vosdroits/R1406',
        ['value', 'lien', 'url', 'contact'],
        true,
      ),
    ],
  },
  sortingGuide: {
    label: 'Consignes de tri',
    filename: 'modele-consignes-de-tri.csv',
    columns: [
      col('name', 'dechet', 'Déchet', 'Pot de yaourt', ['name', 'nom', 'objet'], true),
      col('bin', 'bac', 'Bac ou filière', 'Emballages', ['bin', 'filiere', 'poubelle'], true),
      col(
        'advice',
        'conseil',
        'Conseil',
        'Vider sans laver, déposer en vrac.',
        ['advice', 'consigne'],
        true,
      ),
    ],
  },
};

/** Correspondance automatique : colonne du fichier retenue pour chaque champ (ou `''`). */
export function suggestCsvMapping(
  entity: CsvImportEntity,
  headers: readonly string[],
): Record<string, string> {
  const used = new Set<string>();
  return Object.fromEntries(
    CSV_IMPORT_SPECS[entity].columns.map((c) => {
      const header =
        headers.find((h) => !used.has(h) && c.aliases.includes(normalizeHeader(h))) ?? '';
      if (header) used.add(header);
      return [c.key, header];
    }),
  );
}

/** Lignes du fichier → valeurs par champ, selon la correspondance choisie. */
export function applyCsvMapping(
  rows: readonly Record<string, string>[],
  mapping: Record<string, string>,
): Record<string, string>[] {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(mapping).map(([key, header]) => [
        key,
        header ? (row[header] ?? '').trim() : '',
      ]),
    ),
  );
}

/** Modele telechargeable : en-tetes et une ligne d'exemple. */
export function csvTemplate(entity: CsvImportEntity): string {
  const { columns } = CSV_IMPORT_SPECS[entity];
  return toCsv(
    columns.map((c) => c.header),
    [columns.map((c) => c.example)],
  );
}

/** Rapport d'erreurs telechargeable. */
export function csvErrorReport(errors: readonly CsvRowError[]): string {
  return toCsv(
    ['ligne', 'colonne', 'erreur'],
    errors.map((e) => [e.line, e.column ?? '', e.message]),
  );
}

// ---------------------------------------------------------------------------------------------
// Conversion des cellules
// ---------------------------------------------------------------------------------------------

type Cell = string | undefined;
const blank = (v: Cell) => (v ?? '').trim() === '';

export function parseDecimal(value: Cell): number | null {
  const v = (value ?? '').trim().replace(/\s/g, '').replace(',', '.');
  return v && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : null;
}

/** `oui/non`, `vrai/faux`, `1/0`, `x` ; `null` si vide ; `undefined` si illisible. */
export function parseBoolean(value: Cell): boolean | null | undefined {
  const v = normalizeHeader(value ?? '');
  if (!v) return null;
  if (['oui', 'o', 'vrai', 'true', 'yes', 'y', '1', 'x'].includes(v)) return true;
  if (['non', 'n', 'faux', 'false', 'no', '0'].includes(v)) return false;
  return undefined;
}

/**
 * Date saisie en heure de Paris : `JJ/MM/AAAA`, `JJ/MM/AAAA HH:MM` (ou `HHhMM`), `AAAA-MM-JJ` ou
 * `AAAA-MM-JJ HH:MM` (ou `T`). Renvoie la saisie normalisee `AAAA-MM-JJTHH:MM` et si l'heure manquait.
 */
export function parseParisDateTime(value: Cell): { local: string; dateOnly: boolean } | null {
  const v = (value ?? '').trim();
  const fr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T]+(\d{1,2})[:h](\d{2}))?$/.exec(v);
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/.exec(v);
  const parts = fr
    ? { d: fr[1], m: fr[2], y: fr[3], h: fr[4], min: fr[5] }
    : iso
      ? { d: iso[3], m: iso[2], y: iso[1], h: iso[4], min: iso[5] }
      : null;
  if (!parts?.d || !parts.m || !parts.y) return null;
  const pad = (s: string | undefined) => (s ?? '0').padStart(2, '0');
  const local = `${parts.y}-${pad(parts.m)}-${pad(parts.d)}T${pad(parts.h)}:${pad(parts.min)}`;
  const date = new Date(`${local}:00Z`);
  // Rejette les dates impossibles (31/02) et les heures hors bornes.
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 16) !== local) return null;
  return { local, dateOnly: parts.h === undefined };
}

function matchOption<T extends string>(
  value: Cell,
  options: readonly T[],
  labels: Record<T, string>,
  extra: Record<string, T> = {},
): T | undefined {
  const v = normalizeHeader(value ?? '');
  return (
    options.find((o) => normalizeHeader(o) === v || normalizeHeader(labels[o]) === v) ?? extra[v]
  );
}

/** Position provisoire des lignes a geocoder (remplacee cote serveur avant ecriture). */
const PENDING_POINT = { lat: 0, lng: 0 };

type Built<T> =
  | { ok: true; value: T; geocode: string | null }
  | { ok: false; errors: { column: string | null; message: string }[] };
const fail = <T>(column: string | null, message: string): Built<T> => ({
  ok: false,
  errors: [{ column, message }],
});

function fromZod<T>(
  entity: CsvImportEntity,
  result:
    | { success: true; data: T }
    | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } },
  geocode: string | null,
): Built<T> {
  if (result.success) return { ok: true, value: result.data, geocode };
  const columns = CSV_IMPORT_SPECS[entity].columns;
  return {
    ok: false,
    errors: result.error.issues.map((issue) => {
      const field = String(issue.path[0] ?? '');
      const column =
        columns.find((c) => c.key === field) ??
        columns.find((c) => field === 'point' && c.key === 'lat') ??
        null;
      return {
        column: column?.label ?? null,
        message: column ? `${column.label} : ${issue.message}` : issue.message,
      };
    }),
  };
}

/** Position : latitude et longitude, ou adresse a geocoder si les deux sont vides. */
function position(
  row: Record<string, string>,
  address: string,
): { point: { lat: number; lng: number }; geocode: string | null } | string {
  if (blank(row.lat) && blank(row.lng))
    return address
      ? { point: PENDING_POINT, geocode: address }
      : 'position manquante (adresse ou coordonnées)';
  const lat = parseDecimal(row.lat);
  const lng = parseDecimal(row.lng);
  if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    return 'coordonnées invalides';
  return { point: { lat, lng }, geocode: null };
}

const WHEELCHAIR_EXTRA: Record<string, WheelchairAccess> = {
  oui: 'yes',
  non: 'no',
  partiel: 'limited',
  partiellement: 'limited',
};
const BIN_EXTRA: Record<string, SortingBin> = {
  emballages: 'recycling',
  papiers: 'recycling',
  bac_jaune: 'recycling',
  ordures: 'household',
  ordures_menageres: 'household',
  compost: 'biowaste',
  decheterie: 'dechetterie',
};
const KIND_EXTRA: Record<string, ProcedureKind> = {
  lien: 'link',
  url: 'link',
  site: 'link',
  telephone: 'phone',
  tel: 'phone',
  mail: 'email',
  courriel: 'email',
};

const BUILDERS: {
  [E in CsvImportEntity]: (row: Record<string, string>, ctx: CsvImportContext) => Built<Values[E]>;
} = {
  places: (row, ctx) => {
    const wanted = normalizeHeader(row.category ?? '');
    const category = ctx.placeCategories.find(
      (c) => normalizeHeader(c.key) === wanted || normalizeHeader(c.label) === wanted,
    );
    if (!category) return fail('Catégorie', `catégorie inconnue « ${row.category ?? ''} »`);
    const where = position(row, (row.address ?? '').trim());
    if (typeof where === 'string') return fail('Latitude', where);
    const wheelchair = blank(row.wheelchair)
      ? 'unknown'
      : matchOption(row.wheelchair, WHEELCHAIR_ACCESS, WHEELCHAIR_ACCESS_LABELS, WHEELCHAIR_EXTRA);
    if (!wheelchair)
      return fail(
        'Accès fauteuil',
        `accès fauteuil illisible « ${row.wheelchair ?? ''} » (oui, non ou partiel)`,
      );
    const input: PlaceInput = {
      categoryId: category.id,
      name: row.name ?? '',
      point: where.point,
      address: row.address ?? '',
      openingHours: row.openingHours || null,
      phone: row.phone || null,
      website: row.website || null,
      description: row.description || null,
      accessibility: { wheelchair, toilets: false },
      photoMediaId: null,
      source: 'csv',
      externalId: row.externalId || null,
      detached: false,
      attributes: {},
    };
    return fromZod('places', PlaceInputSchema.safeParse(input), where.geocode);
  },

  events: (row) => {
    const start = parseParisDateTime(row.startsAt);
    if (!start) return fail('Date de début', 'date de début invalide');
    const end = blank(row.endsAt) ? null : parseParisDateTime(row.endsAt);
    if (!blank(row.endsAt) && !end) return fail('Date de fin', 'date de fin invalide');
    const allDayCell = parseBoolean(row.allDay);
    if (allDayCell === undefined)
      return fail('Journée entière', 'journée entière : oui ou non attendu');
    const allDay = allDayCell ?? (start.dateOnly && (end?.dateOnly ?? true));
    const startLocal = allDay ? `${start.local.slice(0, 10)}T00:00` : start.local;
    const endLocal = end
      ? allDay || end.dateOnly
        ? `${end.local.slice(0, 10)}T23:59`
        : end.local
      : allDay
        ? `${start.local.slice(0, 10)}T23:59`
        : null;
    const startsAt = parisInputToIso(startLocal);
    if (!startsAt) return fail('Date de début', 'date de début invalide');
    const endsAt = endLocal
      ? parisInputToIso(endLocal)
      : new Date(Date.parse(startsAt) + 2 * 3600_000).toISOString();
    if (!endsAt) return fail('Date de fin', 'date de fin invalide');
    const category: EventCategory | undefined = blank(row.category)
      ? 'other'
      : matchOption(row.category, EVENT_CATEGORIES, EVENT_CATEGORY_LABELS);
    if (!category) return fail('Catégorie', `catégorie inconnue « ${row.category ?? ''} »`);
    const free = parseBoolean(row.free);
    const accessible = parseBoolean(row.accessible);
    if (free === undefined) return fail('Gratuit', 'gratuit : oui ou non attendu');
    if (accessible === undefined)
      return fail('Accessible PMR', 'accessible PMR : oui ou non attendu');
    const label = (row.location ?? '').trim();
    let geocode: string | null = null;
    let location: EventInput['location'] = null;
    if (label) {
      const where = position(row, label);
      if (typeof where === 'string') return fail('Latitude', where);
      location = { label, point: where.point };
      geocode = where.geocode;
    }
    const input: EventInput = {
      title: row.title ?? '',
      description: richTextFromPlainText(row.description ?? ''),
      category,
      startsAt,
      endsAt,
      allDay,
      rrule: null,
      placeId: null,
      location,
      organizer: row.organizer || null,
      price:
        free === true
          ? { free: true, label: null }
          : row.price
            ? { free: false, label: row.price }
            : null,
      registrationUrl: row.registrationUrl || null,
      coverMediaId: null,
      accessible: accessible ?? false,
      publishAt: null,
    };
    return fromZod('events', EventInputSchema.safeParse(input), geocode);
  },

  procedures: (row) => {
    const category: ProcedureCategory | undefined = blank(row.category)
      ? 'other'
      : matchOption(row.category, PROCEDURE_CATEGORIES, PROCEDURE_CATEGORY_LABELS);
    if (!category) return fail('Catégorie', `catégorie inconnue « ${row.category ?? ''} »`);
    const value = (row.value ?? '').trim();
    const inferred: ProcedureKind = value.includes('@')
      ? 'email'
      : /^https?:\/\//.test(value)
        ? 'link'
        : 'phone';
    const kind = blank(row.kind)
      ? inferred
      : matchOption(row.kind, PROCEDURE_KINDS, PROCEDURE_KIND_LABELS, KIND_EXTRA);
    if (!kind) return fail('Type (lien, téléphone ou email)', `type inconnu « ${row.kind ?? ''} »`);
    // L'ordre d'affichage est attribue a l'ecriture (a la suite des demarches existantes).
    return fromZod(
      'procedures',
      ProcedureInputSchema.safeParse({
        category,
        title: row.title ?? '',
        description: row.description ?? '',
        kind,
        value,
        order: 0,
      }),
      null,
    );
  },

  sortingGuide: (row) => {
    const bin: SortingBin | undefined = matchOption(
      row.bin,
      SORTING_BINS,
      SORTING_BIN_LABELS,
      BIN_EXTRA,
    );
    if (!bin) return fail('Bac ou filière', `bac ou filière inconnu « ${row.bin ?? ''} »`);
    return fromZod(
      'sortingGuide',
      SortingGuideItemInputSchema.safeParse({
        name: row.name ?? '',
        bin,
        advice: row.advice ?? '',
      }),
      null,
    );
  },
};

/**
 * Valide TOUTES les lignes (valeurs par champ, dans l'ordre du fichier) : la ligne 1 est l'en-tete,
 * la premiere ligne de donnees est donc la ligne 2 (`firstLine` pour les lots suivants).
 */
export function validateCsvRows<E extends CsvImportEntity>(
  entity: E,
  rows: readonly Record<string, string>[],
  ctx: CsvImportContext,
  firstLine = 2,
): CsvValidation<Values[E]> {
  const build = BUILDERS[entity];
  const valid: CsvValidRow<Values[E]>[] = [];
  const errors: CsvRowError[] = [];
  rows.forEach((row, index) => {
    const line = firstLine + index;
    const result = build(row, ctx);
    if (result.ok) valid.push({ line, value: result.value, geocode: result.geocode });
    else errors.push(...result.errors.map((e) => ({ line, ...e })));
  });
  return { valid, errors };
}
