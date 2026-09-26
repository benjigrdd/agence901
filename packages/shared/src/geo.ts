import type { GeoMultiPolygon, GeoPoint, Position } from './schemas/geo';

const EARTH_RADIUS_M = 6_371_008.8;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distance orthodromique (haversine) en metres. */
export function distanceInMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function inRing(point: GeoPoint, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const pi = ring[i];
    const pj = ring[j];
    if (!pi || !pj) continue;
    const [xi, yi] = pi;
    const [xj, yj] = pj;
    const crosses = yi > point.lat !== yj > point.lat;
    if (crosses && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Point dans un MultiPolygon (contours exterieurs moins les trous). */
export function isPointInMultiPolygon(point: GeoPoint, geom: GeoMultiPolygon): boolean {
  return geom.coordinates.some(([outer, ...holes]) => {
    if (!outer || !inRing(point, outer)) return false;
    return !holes.some((hole) => inRing(point, hole));
  });
}

/** Carre centre sur un point, utile pour les fixtures et les valeurs par defaut. */
export function squareAround(center: GeoPoint, halfSizeDeg: number): GeoMultiPolygon {
  const { lat, lng } = center;
  const d = halfSizeDeg;
  return {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [lng - d, lat - d],
          [lng + d, lat - d],
          [lng + d, lat + d],
          [lng - d, lat + d],
          [lng - d, lat - d],
        ],
      ],
    ],
  };
}
