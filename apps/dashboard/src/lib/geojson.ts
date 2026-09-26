import type { GeoMultiPolygon } from '@app/shared';
import { GeoPolygonalSchema, toMultiPolygon } from '@app/shared';
import { z } from 'zod';

const GeoJsonInputSchema = z.union([
  GeoPolygonalSchema,
  z.object({ type: z.literal('Feature'), geometry: GeoPolygonalSchema }),
  z.object({ type: z.literal('FeatureCollection'), features: z.array(z.object({ geometry: GeoPolygonalSchema })).min(1) }),
]);

/** Lit un GeoJSON (geometrie, Feature ou FeatureCollection) Polygon/MultiPolygon en WGS84. */
export function parsePolygonGeoJson(text: string): { ok: true; geom: GeoMultiPolygon } | { ok: false; message: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, message: 'Fichier illisible : JSON invalide.' };
  }
  const parsed = GeoJsonInputSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, message: 'GeoJSON non reconnu : un Polygon ou MultiPolygon en WGS84 (longitude, latitude) est attendu.' };
  }
  const data = parsed.data;
  if (data.type === 'Feature') return { ok: true, geom: toMultiPolygon(data.geometry) };
  if (data.type === 'FeatureCollection') {
    return { ok: true, geom: { type: 'MultiPolygon', coordinates: data.features.flatMap((f) => toMultiPolygon(f.geometry).coordinates) } };
  }
  return { ok: true, geom: toMultiPolygon(data) };
}
