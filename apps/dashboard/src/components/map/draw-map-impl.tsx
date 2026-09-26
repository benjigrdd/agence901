'use client';

import 'maplibre-gl/dist/maplibre-gl.css';

import type { GeoMultiPolygon, GeoPoint } from '@app/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MapEvent } from 'react-map-gl/maplibre';
import Map, { AttributionControl, Layer, NavigationControl, Source } from 'react-map-gl/maplibre';
import type { GeoJSONStoreFeatures, HexColor } from 'terra-draw';
import { TerraDraw, TerraDrawPolygonMode, TerraDrawSelectMode } from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';

import { Button } from '@/components/ui/button';

import { mapStyleUrl } from './map-view-impl';

export type DrawMapProps = {
  center: GeoPoint;
  ariaLabel: string;
  value: GeoMultiPolygon | null;
  onChange: (geom: GeoMultiPolygon | null) => void;
  /** Autres polygones affiches en lecture seule. */
  background?: { id: string; name: string; color: string; geom: GeoMultiPolygon }[];
  color: string;
};

const LOCALE = { 'NavigationControl.ZoomIn': 'Zoomer', 'NavigationControl.ZoomOut': 'Dézoomer' };

type Ring = [number, number][];

const hex = (c: string): HexColor => `#${c.replace(/^#/, '')}`;

function toFeatures(geom: GeoMultiPolygon | null): GeoJSONStoreFeatures[] {
  if (!geom) return [];
  return geom.coordinates.map((polygon, i) => ({
    id: `poly-${i}-${Date.now()}`,
    type: 'Feature' as const,
    properties: { mode: 'polygon' },
    geometry: { type: 'Polygon' as const, coordinates: polygon.map((ring) => ring.map(([lng, lat]) => [lng, lat])) },
  }));
}

function fromSnapshot(features: GeoJSONStoreFeatures[]): GeoMultiPolygon | null {
  const polygons: Ring[][] = [];
  for (const f of features) {
    if (f.geometry.type !== 'Polygon') continue;
    const rings = f.geometry.coordinates.map((ring) => ring.map((p): [number, number] => [p[0] ?? 0, p[1] ?? 0]));
    if (rings[0] && rings[0].length >= 4) polygons.push(rings);
  }
  return polygons.length ? { type: 'MultiPolygon', coordinates: polygons } : null;
}

/** Dessin de polygones (terra-draw) : creer, deplacer les sommets, supprimer. */
export function DrawMapImpl({ center, ariaLabel, value, onChange, background = [], color }: DrawMapProps) {
  const drawRef = useRef<TerraDraw | null>(null);
  const initial = useRef(value);
  const onChangeRef = useRef(onChange);
  const [mode, setMode] = useState<'polygon' | 'select'>('select');

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => () => drawRef.current?.stop(), []);

  const onLoad = (event: MapEvent) => {
    const draw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map: event.target }),
      modes: [
        new TerraDrawPolygonMode({ styles: { fillColor: hex(color), outlineColor: hex(color) } }),
        new TerraDrawSelectMode({
          flags: { polygon: { feature: { draggable: true, coordinates: { midpoints: true, draggable: true, deletable: true } } } },
        }),
      ],
    });
    draw.start();
    draw.addFeatures(toFeatures(initial.current));
    draw.setMode('select');
    draw.on('change', () => onChangeRef.current(fromSnapshot(draw.getSnapshot())));
    drawRef.current = draw;
  };

  const backgroundData = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: background.map((b) => ({ type: 'Feature' as const, properties: { color: b.color }, geometry: b.geom })),
    }),
    [background],
  );

  const switchMode = (next: 'polygon' | 'select') => {
    drawRef.current?.setMode(next);
    setMode(next);
  };

  const removeSelected = () => {
    const draw = drawRef.current;
    if (!draw) return;
    const selected = draw.getSnapshot().filter((f) => f.properties.selected);
    draw.removeFeatures(selected.map((f) => f.id).filter((id): id is string | number => id !== undefined));
    onChange(fromSnapshot(draw.getSnapshot()));
  };

  return (
    <div className="space-y-2">
      <div role="toolbar" aria-label="Outils de dessin" className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={mode === 'polygon' ? 'secondary' : 'outline'} aria-pressed={mode === 'polygon'} onClick={() => switchMode('polygon')}>
          Dessiner un polygone
        </Button>
        <Button type="button" size="sm" variant={mode === 'select' ? 'secondary' : 'outline'} aria-pressed={mode === 'select'} onClick={() => switchMode('select')}>
          Sélectionner / modifier les sommets
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={removeSelected}>
          Supprimer le polygone sélectionné
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            drawRef.current?.clear();
            onChange(null);
          }}
        >
          Tout effacer
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Cliquez pour poser chaque sommet, puis cliquez sur le premier point pour fermer le polygone. Sans souris, utilisez l’import GeoJSON.
      </p>
      <div role="region" aria-label={ariaLabel} className="h-[460px] w-full overflow-hidden rounded-md border">
        <Map
          initialViewState={{ latitude: center.lat, longitude: center.lng, zoom: 13 }}
          mapStyle={mapStyleUrl()}
          attributionControl={false}
          locale={LOCALE}
          onLoad={onLoad}
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="top-right" showCompass={false} />
          <AttributionControl compact={false} customAttribution="© contributeurs OpenStreetMap" />
          {background.length ? (
            <Source id="autres-quartiers" type="geojson" data={backgroundData}>
              <Layer id="autres-fond" type="fill" paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': 0.12 }} />
              <Layer id="autres-contour" type="line" paint={{ 'line-color': ['get', 'color'], 'line-width': 1, 'line-dasharray': [2, 2] }} />
            </Source>
          ) : null}
        </Map>
      </div>
    </div>
  );
}
