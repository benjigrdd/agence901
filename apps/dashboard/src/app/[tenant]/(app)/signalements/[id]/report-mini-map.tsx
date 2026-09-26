'use client';

import type { GeoPoint } from '@app/shared';

import { MapView } from '@/components/map/map-view';

export function ReportMiniMap({ point, reference, address }: { point: GeoPoint; reference: string; address: string }) {
  return (
    <MapView
      center={point}
      zoom={16}
      pin={point}
      ariaLabel={`Position du signalement ${reference} : ${address}`}
      className="h-56 w-full overflow-hidden rounded-md border"
    />
  );
}
