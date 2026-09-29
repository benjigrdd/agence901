import type { GeoPoint } from '@app/shared';
import { z } from 'zod';

/** API Adresse de la Géoplateforme (IGN) : gratuite, sans clé, sans traceur. */
const BASE_URL = 'https://data.geopf.fr/geocodage/search';

const ResponseSchema = z.object({
  features: z.array(
    z.object({
      properties: z.object({ label: z.string() }),
      geometry: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
    }),
  ),
});

/** `approximate` : saisie libre non trouvée, positionnée au centre de la commune. */
export type AddressMatch = { label: string; point: GeoPoint; approximate?: boolean };

/** Adresses de la commune (code INSEE) correspondant à la saisie ; liste vide en cas d'erreur réseau. */
export async function searchAddress(text: string, inseeCode: string): Promise<AddressMatch[]> {
  const q = text.trim();
  if (q.length < 3) return [];
  try {
    const params = new URLSearchParams({ q, limit: '5', index: 'address', citycode: inseeCode });
    const response = await fetch(`${BASE_URL}?${params.toString()}`);
    if (!response.ok) return [];
    const parsed = ResponseSchema.safeParse(await response.json());
    if (!parsed.success) return [];
    return parsed.data.features.map((f) => ({
      label: f.properties.label,
      point: { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] },
    }));
  } catch {
    return [];
  }
}
