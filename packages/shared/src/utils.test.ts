import { describe, expect, it } from 'vitest';

import { contrastRatio, isAccessiblePair } from './contrast';
import { distanceInMeters, isPointInMultiPolygon, squareAround } from './geo';
import { formatReportReference, parseReportReference } from './reference';

describe('formatReportReference', () => {
  it('complète le numéro sur 5 chiffres', () => {
    expect(formatReportReference(2026, 42)).toBe('2026-00042');
    expect(formatReportReference(2026, 99_999)).toBe('2026-99999');
  });

  it('refuse les valeurs hors bornes', () => {
    expect(() => formatReportReference(2026, 0)).toThrow(RangeError);
    expect(() => formatReportReference(2026, 100_000)).toThrow(RangeError);
    expect(() => formatReportReference(1999, 1)).toThrow(RangeError);
  });

  it('relit une référence', () => {
    expect(parseReportReference('2026-00042')).toEqual({ year: 2026, n: 42 });
    expect(parseReportReference('26-42')).toBeNull();
  });
});

describe('contraste WCAG', () => {
  it('calcule les ratios de référence', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2);
  });

  it('isAccessiblePair applique 4,5 par défaut et accepte un seuil', () => {
    expect(isAccessiblePair('#767676', '#FFFFFF')).toBe(true);
    expect(isAccessiblePair('#777777', '#FFFFFF')).toBe(false);
    expect(isAccessiblePair('#949494', '#FFFFFF', 3)).toBe(true);
  });
});

describe('géographie', () => {
  const center = { lat: 47.39, lng: 0.69 };

  it('mesure une distance', () => {
    expect(distanceInMeters(center, center)).toBe(0);
    const d = distanceInMeters(center, { lat: 47.391, lng: 0.69 });
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(120);
  });

  it('teste un point dans un polygone', () => {
    const square = squareAround(center, 0.01);
    expect(isPointInMultiPolygon(center, square)).toBe(true);
    expect(isPointInMultiPolygon({ lat: 47.5, lng: 0.69 }, square)).toBe(false);
  });
});
