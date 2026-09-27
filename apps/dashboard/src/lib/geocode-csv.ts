import type { GeoPoint } from '@app/shared';
import { parseCsv, toCsv } from '@app/shared';

/** Score minimal de l'API Adresse en dessous duquel une adresse importee est refusee. */
export const GEOCODE_MIN_SCORE = 0.6;

/** Fichier envoye au geocodage en masse : une adresse par ligne, restreinte a la commune (code INSEE). */
export function geocodeRequestCsv(
  items: readonly { id: string; address: string }[],
  citycode: string,
): string {
  return toCsv(
    ['id', 'adresse', 'citycode'],
    items.map((i) => [i.id, i.address, citycode]),
  ).replace(/^\uFEFF/, '');
}

/** Reponse CSV de l'API : position retenue par identifiant, ou `null` (score insuffisant, introuvable). */
export function parseGeocodeResponse(
  text: string,
  minScore = GEOCODE_MIN_SCORE,
): Map<string, GeoPoint | null> {
  const out = new Map<string, GeoPoint | null>();
  for (const row of parseCsv(text).rows) {
    const id = row.id ?? '';
    const lat = Number(row.latitude);
    const lng = Number(row.longitude);
    const score = Number(row.result_score);
    const ok =
      row.latitude !== '' &&
      row.longitude !== '' &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Number.isFinite(score) &&
      score >= minScore;
    if (id) out.set(id, ok ? { lat, lng } : null);
  }
  return out;
}
