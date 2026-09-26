'use client';

import 'maplibre-gl/dist/maplibre-gl.css';

import type { GeoMultiPolygon, GeoPoint } from '@app/shared';
import type { ReactNode } from 'react';
import { useMemo, useRef } from 'react';
import type { MapLayerMouseEvent, MapRef, MarkerDragEvent } from 'react-map-gl/maplibre';
import Map, { AttributionControl, Layer, Marker, NavigationControl, Source } from 'react-map-gl/maplibre';

export const DEFAULT_MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

export function mapStyleUrl(): string {
  return process.env.NEXT_PUBLIC_MAP_STYLE_URL || DEFAULT_MAP_STYLE;
}

export type MapMarker = {
  id: string;
  point: GeoPoint;
  label: string;
  color?: string;
  /** Contenu du marqueur (icone + texte court), jamais la couleur seule. */
  content?: ReactNode;
  onClick?: () => void;
};

/** Au-dela, les marqueurs sont regroupes (clustering) ; la vue Liste reste l'alternative detaillee. */
export const CLUSTER_THRESHOLD = 50;

export type MapPolygon = { id: string; geom: GeoMultiPolygon; color: string; label: string };

export type MapViewProps = {
  center: GeoPoint;
  zoom?: number;
  /** Decrit la carte pour les lecteurs d'ecran (region). */
  ariaLabel: string;
  markers?: MapMarker[];
  polygons?: MapPolygon[];
  /** Epingle deplacable (selection d'un point). */
  pin?: GeoPoint | null;
  onPinChange?: (point: GeoPoint) => void;
  className?: string;
  children?: ReactNode;
};

const LOCALE = {
  'NavigationControl.ZoomIn': 'Zoomer',
  'NavigationControl.ZoomOut': 'Dézoomer',
  'NavigationControl.ResetBearing': 'Réorienter vers le nord',
  'AttributionControl.ToggleAttribution': 'Afficher les crédits',
};

export function MapViewImpl({ center, zoom = 13, ariaLabel, markers = [], polygons = [], pin, onPinChange, className, children }: MapViewProps) {
  const polygonData = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: polygons.map((p) => ({
        type: 'Feature' as const,
        id: p.id,
        properties: { color: p.color, label: p.label },
        geometry: p.geom,
      })),
    }),
    [polygons],
  );

  const mapRef = useRef<MapRef>(null);
  const clustered = markers.length > CLUSTER_THRESHOLD;
  const markerData = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: clustered
        ? markers.map((m) => ({
            type: 'Feature' as const,
            properties: { id: m.id, color: m.color ?? '#1d4ed8' },
            geometry: { type: 'Point' as const, coordinates: [m.point.lng, m.point.lat] },
          }))
        : [],
    }),
    [markers, clustered],
  );

  const onClick = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (clustered && feature) {
      const clusterId = feature.properties?.cluster_id;
      if (typeof clusterId === 'number') {
        mapRef.current?.easeTo({ center: event.lngLat, zoom: (mapRef.current.getZoom() ?? 13) + 2 });
        return;
      }
      const id = feature.properties?.id;
      markers.find((m) => m.id === id)?.onClick?.();
      return;
    }
    if (onPinChange) onPinChange({ lat: event.lngLat.lat, lng: event.lngLat.lng });
  };

  return (
    <div role="region" aria-label={ariaLabel} className={className ?? 'h-80 w-full overflow-hidden rounded-md border'}>
      <Map
        initialViewState={{ latitude: center.lat, longitude: center.lng, zoom }}
        mapStyle={mapStyleUrl()}
        attributionControl={false}
        locale={LOCALE}
        ref={mapRef}
        onClick={onClick}
        interactiveLayerIds={clustered ? ['groupes', 'points'] : undefined}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <AttributionControl compact={false} customAttribution="© contributeurs OpenStreetMap" />
        {polygons.length > 0 ? (
          <Source id="polygones" type="geojson" data={polygonData}>
            <Layer id="polygones-fond" type="fill" paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': 0.2 }} />
            <Layer id="polygones-contour" type="line" paint={{ 'line-color': ['get', 'color'], 'line-width': 2 }} />
          </Source>
        ) : null}
        {clustered ? (
          <Source id="marqueurs" type="geojson" data={markerData} cluster clusterRadius={40}>
            <Layer id="groupes" type="circle" filter={['has', 'point_count']} paint={{ 'circle-color': '#1e3a8a', 'circle-radius': ['step', ['get', 'point_count'], 16, 20, 22, 100, 28], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 }} />
            <Layer id="points" type="circle" filter={['!', ['has', 'point_count']]} paint={{ 'circle-color': ['get', 'color'], 'circle-radius': 7, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 }} />
          </Source>
        ) : null}
        {(clustered ? [] : markers).map((m) => (
          <Marker key={m.id} latitude={m.point.lat} longitude={m.point.lng} anchor="bottom">
            <button
              type="button"
              onClick={m.onClick}
              aria-label={m.label}
              data-map-marker
              className="flex min-h-6 min-w-6 items-center justify-center gap-1 rounded-full border-2 border-white px-2 py-0.5 text-xs font-semibold text-white shadow"
              style={{ backgroundColor: m.color ?? '#1d4ed8' }}
            >
              {m.content ?? '●'}
            </button>
          </Marker>
        ))}
        {pin ? (
          <Marker
            latitude={pin.lat}
            longitude={pin.lng}
            anchor="bottom"
            draggable={!!onPinChange}
            onDragEnd={(event: MarkerDragEvent) => onPinChange?.({ lat: event.lngLat.lat, lng: event.lngLat.lng })}
          >
            <span className="block size-6 rounded-full border-4 border-white bg-red-700 shadow" aria-hidden="true" />
          </Marker>
        ) : null}
        {children}
      </Map>
    </div>
  );
}
