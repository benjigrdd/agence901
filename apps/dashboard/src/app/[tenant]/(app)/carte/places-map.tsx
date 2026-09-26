'use client';

import type { GeoPoint } from '@app/shared';
import { useRouter } from 'next/navigation';

import { MapView } from '@/components/map/map-view';

import type { PlaceRow } from './places-table';

export function PlacesMap({ slug, center, rows }: { slug: string; center: GeoPoint; rows: PlaceRow[] }) {
  const router = useRouter();
  return (
    <MapView
      center={center}
      ariaLabel={`Carte des ${rows.length} lieux. La vue Liste présente les mêmes informations.`}
      className="h-[560px] w-full overflow-hidden rounded-md border"
      markers={rows.map((r) => ({
        id: r.id,
        point: r.point,
        color: r.color,
        label: `${r.name}, ${r.category}`,
        content: <span className="max-w-32 truncate">{r.name}</span>,
        onClick: () => router.push(`/${slug}/carte/${r.id}`),
      }))}
    />
  );
}
