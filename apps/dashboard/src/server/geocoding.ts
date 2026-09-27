import 'server-only';

import type { GeoPoint } from '@app/shared';
import { z } from 'zod';

import { geocodeRequestCsv, parseGeocodeResponse } from '@/lib/geocode-csv';

/** API Adresse de la Geoplateforme (IGN) : gratuite, sans cle. */
const BASE_URL = 'https://data.geopf.fr/geocodage';

export type GeocodeResult = { label: string; point: GeoPoint };

const ResponseSchema = z.object({
  features: z.array(
    z.object({
      properties: z.object({ label: z.string() }),
      geometry: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
    }),
  ),
});

async function query(path: string, params: Record<string, string>): Promise<GeocodeResult[]> {
  try {
    const response = await fetch(`${BASE_URL}/${path}?${new URLSearchParams(params).toString()}`, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 86_400 },
    });
    if (!response.ok) return [];
    const parsed = ResponseSchema.safeParse(await response.json());
    if (!parsed.success) return [];
    return parsed.data.features.map((f) => ({
      label: f.properties.label,
      point: { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] },
    }));
  } catch {
    // Erreur silencieuse : la saisie manuelle et le placement sur la carte restent possibles.
    return [];
  }
}

/** Recherche restreinte a la commune (code INSEE). */
export async function searchAddress(text: string, inseeCode: string | null): Promise<GeocodeResult[]> {
  const q = text.trim();
  if (q.length < 3) return [];
  return query('search', { q, limit: '5', index: 'address', ...(inseeCode ? { citycode: inseeCode } : {}) });
}

export async function reverseGeocode(point: GeoPoint): Promise<GeocodeResult | null> {
  const [first] = await query('reverse', { lat: String(point.lat), lon: String(point.lng), limit: '1', index: 'address' });
  return first ?? null;
}

/**
 * Geocodage en masse (import CSV) : API Adresse en mode CSV, une requete pour tout le lot, restreinte
 * a la commune. Renvoie la position par identifiant, `null` si l'adresse n'est pas trouvee (score < 0,6).
 */
export async function geocodeBatch(
  items: readonly { id: string; address: string }[],
  inseeCode: string,
): Promise<Map<string, GeoPoint | null>> {
  if (items.length === 0) return new Map();
  const form = new FormData();
  form.append(
    'data',
    new Blob([geocodeRequestCsv(items, inseeCode)], { type: 'text/csv' }),
    'adresses.csv',
  );
  form.append('columns', 'adresse');
  form.append('citycode', 'citycode');
  form.append('indexes', 'address');
  try {
    const response = await fetch(`${process.env.GEOCODER_URL ?? BASE_URL}/search/csv`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return new Map();
    return parseGeocodeResponse(await response.text());
  } catch {
    return new Map();
  }
}
