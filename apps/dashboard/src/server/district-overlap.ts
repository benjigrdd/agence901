import 'server-only';

import type { GeoMultiPolygon } from '@app/shared';
import { featureCollection, multiPolygon } from '@turf/helpers';
import intersect from '@turf/intersect';

/** Noms des quartiers dont le polygone chevauche celui donne (avertissement non bloquant). */
export function overlappingDistricts(geom: GeoMultiPolygon, others: { name: string; geom: GeoMultiPolygon }[]): string[] {
  const target = multiPolygon(geom.coordinates);
  return others
    .filter((o) => {
      try {
        return intersect(featureCollection([target, multiPolygon(o.geom.coordinates)])) !== null;
      } catch {
        return false;
      }
    })
    .map((o) => o.name);
}
