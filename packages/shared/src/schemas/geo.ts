import { z } from 'zod';

export const GeoPointSchema = z.object({
  lat: z
    .number({ error: 'Latitude invalide' })
    .min(-90, { error: 'Latitude hors bornes' })
    .max(90, { error: 'Latitude hors bornes' }),
  lng: z
    .number({ error: 'Longitude invalide' })
    .min(-180, { error: 'Longitude hors bornes' })
    .max(180, { error: 'Longitude hors bornes' }),
});
export type GeoPoint = z.infer<typeof GeoPointSchema>;

/** Position GeoJSON : [longitude, latitude] en WGS84. */
export const PositionSchema = z.tuple([
  z.number().min(-180, { error: 'Longitude hors bornes' }).max(180, { error: 'Longitude hors bornes' }),
  z.number().min(-90, { error: 'Latitude hors bornes' }).max(90, { error: 'Latitude hors bornes' }),
]);
export type Position = z.infer<typeof PositionSchema>;

export const LinearRingSchema = z
  .array(PositionSchema)
  .min(4, { error: 'Un contour doit compter au moins 4 points' })
  .refine(
    (ring) => {
      const first = ring[0];
      const last = ring[ring.length - 1];
      return first !== undefined && last !== undefined && first[0] === last[0] && first[1] === last[1];
    },
    { error: 'Le contour doit être fermé (premier point = dernier point)' },
  );

export const PolygonCoordinatesSchema = z.array(LinearRingSchema).min(1);

export const GeoPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: PolygonCoordinatesSchema,
});
export type GeoPolygon = z.infer<typeof GeoPolygonSchema>;

export const GeoMultiPolygonSchema = z.object({
  type: z.literal('MultiPolygon', { error: 'Géométrie MultiPolygon attendue' }),
  coordinates: z.array(PolygonCoordinatesSchema).min(1, { error: 'Au moins un polygone est requis' }),
});
export type GeoMultiPolygon = z.infer<typeof GeoMultiPolygonSchema>;

/** Accepte un Polygon ou un MultiPolygon (import GeoJSON) et le normalise en MultiPolygon. */
export const GeoPolygonalSchema = z.union([GeoPolygonSchema, GeoMultiPolygonSchema], {
  error: 'Géométrie Polygon ou MultiPolygon en WGS84 attendue',
});

export function toMultiPolygon(geom: GeoPolygon | GeoMultiPolygon): GeoMultiPolygon {
  return geom.type === 'MultiPolygon' ? geom : { type: 'MultiPolygon', coordinates: [geom.coordinates] };
}
