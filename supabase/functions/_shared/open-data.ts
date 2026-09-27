// Bornes de recharge (IRVE, schema national consolide data.gouv.fr). Fonctions pures (sans Deno) :
// testees par Vitest (packages/data/src/supabase/open-data.test.ts) et utilisees par `import-irve`.
import type { OsmPlace } from './osm-mapping.ts';

/** Lieu pret a importer : meme forme que les lieux OSM (colonnes de `places`, cle de categorie). */
export type ImportedPlace = Omit<OsmPlace, 'attributes'> & {
  attributes: { subtype?: string; chargePoints?: number; powersKw?: number[]; operator?: string };
};

/** Jeu « Base nationale des IRVE » (donnees statiques), verifie le 27/09/2026 : voir docs/imports.md. */
export const IRVE_DATASET_ID = '5448d3e0c751df01f85d0572';

export type DatagouvResource = {
  id: string;
  format?: string;
  type?: string;
  title?: string;
  last_modified?: string;
};

/**
 * Ressource CSV la plus recente de la consolidation (jamais d'URL datee en dur) : on privilegie la
 * « derniere version a date du schema », sinon la ressource CSV principale modifiee le plus recemment.
 */
export function latestIrveResource(
  resources: readonly DatagouvResource[],
): DatagouvResource | null {
  const csv = resources
    .filter(
      (r) =>
        r.format?.toLowerCase() === 'csv' &&
        (r.type ?? 'main') === 'main' &&
        /consolidation/i.test(r.title ?? ''),
    )
    .sort((a, b) => (b.last_modified ?? '').localeCompare(a.last_modified ?? ''));
  return csv.find((r) => /derni[eè]re version/i.test(r.title ?? '')) ?? csv[0] ?? null;
}

export type IrveRow = Record<string, unknown>;

const text = (v: unknown) => (v === null || v === undefined ? '' : String(v)).trim();

function coordinates(row: IrveRow): { lat: number; lng: number } | null {
  const lat = Number(text(row.consolidated_latitude));
  const lng = Number(text(row.consolidated_longitude));
  if (text(row.consolidated_latitude) && Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0)
    return { lat, lng };
  // `coordonneesXY` : « [longitude, latitude] » (texte dans le CSV, tableau dans l'API tabulaire).
  const xy = /\[?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]?/.exec(text(row.coordonneesXY));
  return xy ? { lng: Number(xy[1]), lat: Number(xy[2]) } : null;
}

/** Une station (plusieurs points de charge) = un lieu « borne de recharge ». */
export function irveToPlaces(rows: readonly IrveRow[]): ImportedPlace[] {
  const stations = new Map<string, IrveRow[]>();
  for (const row of rows) {
    const id = text(row.id_station_itinerance) || text(row.id_station_local);
    if (id) stations.set(id, [...(stations.get(id) ?? []), row]);
  }
  return [...stations].flatMap(([id, points]) => {
    const first = points[0];
    const position = first ? coordinates(first) : null;
    if (!first || !position) return [];
    const declared = Number(text(first.nbre_pdc));
    const chargePoints = Number.isInteger(declared) && declared > 0 ? declared : points.length;
    const powersKw = [
      ...new Set(
        points
          .map((p) => Number(text(p.puissance_nominale)))
          .filter((p) => Number.isFinite(p) && p > 0),
      ),
    ].sort((a, b) => a - b);
    const operator = (text(first.nom_operateur) || text(first.nom_enseigne)).slice(0, 120);
    const pmr = text(first.accessibilite_pmr).toLowerCase();
    const maxPower = powersKw.at(-1);
    return [
      {
        externalId: id,
        categoryKey: 'borne-recharge',
        name: (text(first.nom_station) || 'Borne de recharge').slice(0, 120),
        ...position,
        address: (text(first.adresse_station) || 'Adresse non renseignée').slice(0, 300),
        openingHours: text(first.horaires) === '24/7' ? '24/7' : null,
        phone: null,
        website: null,
        description: [
          `${chargePoints} point${chargePoints > 1 ? 's' : ''} de charge`,
          maxPower ? `jusqu’à ${maxPower} kW` : '',
          operator,
        ]
          .filter(Boolean)
          .join(' · ')
          .slice(0, 1000),
        wheelchair: pmr.startsWith('accessible')
          ? 'yes'
          : pmr.includes('non accessible')
            ? 'no'
            : 'unknown',
        attributes: { chargePoints, powersKw, ...(operator ? { operator } : {}) },
      },
    ];
  });
}
