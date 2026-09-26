'use server';

import type { GeoPoint } from '@app/shared';
import { GeoPointSchema } from '@app/shared';

import type { GeocodeResult } from '@/server/geocoding';
import { reverseGeocode, searchAddress } from '@/server/geocoding';
import { requireTenant } from '@/server/guards';

export async function searchAddressAction(slug: string, text: string): Promise<GeocodeResult[]> {
  const { tenant } = await requireTenant(slug);
  return searchAddress(String(text).slice(0, 200), tenant.inseeCode);
}

export async function reverseGeocodeAction(slug: string, point: GeoPoint): Promise<GeocodeResult | null> {
  await requireTenant(slug);
  const parsed = GeoPointSchema.safeParse(point);
  return parsed.success ? reverseGeocode(parsed.data) : null;
}
