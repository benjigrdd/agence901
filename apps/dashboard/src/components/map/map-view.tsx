'use client';

import dynamic from 'next/dynamic';

import type { MapViewProps } from './map-view-impl';

/** MapLibre ne fonctionne que dans le navigateur : chargement cote client uniquement. */
export const MapView = dynamic<MapViewProps>(() => import('./map-view-impl').then((m) => m.MapViewImpl), {
  ssr: false,
  loading: () => <div className="bg-muted h-full min-h-64 w-full animate-pulse rounded-md" aria-hidden="true" />,
});

export type { MapMarker, MapPolygon, MapViewProps } from './map-view-impl';
