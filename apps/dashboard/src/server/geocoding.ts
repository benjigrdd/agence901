import 'server-only';

import type { GeoPoint } from '@app/shared';
import { z } from 'zod';

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
