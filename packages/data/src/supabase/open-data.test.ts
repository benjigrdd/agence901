import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { irveToPlaces, latestIrveResource } from '../../../../supabase/functions/_shared/open-data';

const root = resolve(import.meta.dirname, '../../../..');

describe('copie Deno de la correspondance OSM', () => {
  it('est identique à @app/shared/osm-mapping.ts (sinon : pnpm db:generate)', () => {
    const source = readFileSync(resolve(root, 'packages/shared/src/osm-mapping.ts'), 'utf8');
    const copy = readFileSync(resolve(root, 'supabase/functions/_shared/osm-mapping.ts'), 'utf8');
    expect(copy.slice(copy.indexOf('\n') + 1)).toBe(source);
  });
});

describe('ressource IRVE la plus récente', () => {
  it('préfère la « dernière version à date » du schéma, sans URL datée en dur', () => {
    const resource = latestIrveResource([
      {
        id: 'doc',
        format: 'csv',
        type: 'documentation',
        title: 'Documentation sur la consolidation',
        last_modified: '2026-09-27',
      },
      {
        id: 'geo',
        format: 'geojson',
        type: 'main',
        title: 'Export au format geojson',
        last_modified: '2026-09-27',
      },
      {
        id: 'v231',
        format: 'csv',
        type: 'main',
        title: 'Consolidation de la v2.3.1 du schéma - 20260927',
        last_modified: '2026-09-27T07:04:20',
      },
      {
        id: 'latest',
        format: 'csv',
        type: 'main',
        title: 'Consolidation de la dernière version à date du schéma (v2.3.1) - 20260927',
        last_modified: '2026-09-27T07:04:40',
      },
    ]);
    expect(resource?.id).toBe('latest');
  });

  it('à défaut, la consolidation CSV modifiée le plus récemment', () => {
    expect(
      latestIrveResource([
        { id: 'old', format: 'CSV', title: 'Consolidation v2.2', last_modified: '2025-01-01' },
        { id: 'new', format: 'csv', title: 'Consolidation v2.3', last_modified: '2026-01-01' },
      ])?.id,
    ).toBe('new');
    expect(latestIrveResource([])).toBeNull();
  });
});

describe('import IRVE', () => {
  it('une station = un lieu, avec points de charge, puissances et opérateur', () => {
    const places = irveToPlaces([
      {
        id_station_itinerance: 'FRS1',
        nom_station: 'Parking de la gare',
        adresse_station: '1 place de la Gare',
        coordonneesXY: '[0.69, 47.39]',
        nbre_pdc: 3,
        puissance_nominale: 22,
        nom_operateur: 'Opérateur',
        horaires: '24/7',
        accessibilite_pmr: 'Accessible mais non réservé PMR',
      },
      { id_station_itinerance: 'FRS1', puissance_nominale: 50, coordonneesXY: '[0.69, 47.39]' },
      { id_station_itinerance: 'FRS1', puissance_nominale: 22, coordonneesXY: '[0.69, 47.39]' },
      // API tabulaire : coordonnees en tableau, nombre de points deduit des lignes.
      { id_station_itinerance: 'FRS2', coordonneesXY: [0.7, 47.4], puissance_nominale: 7.4 },
      { id_station_itinerance: '', nom_station: 'Sans identifiant' },
    ]);
    expect(places).toHaveLength(2);
    expect(places[0]).toMatchObject({
      externalId: 'FRS1',
      categoryKey: 'borne-recharge',
      name: 'Parking de la gare',
      lat: 47.39,
      lng: 0.69,
      openingHours: '24/7',
      wheelchair: 'yes',
      description: '3 points de charge · jusqu’à 50 kW · Opérateur',
      attributes: { chargePoints: 3, powersKw: [22, 50], operator: 'Opérateur' },
    });
    expect(places[1]).toMatchObject({
      externalId: 'FRS2',
      lat: 47.4,
      lng: 0.7,
      attributes: { chargePoints: 1, powersKw: [7.4] },
    });
  });

  it('préfère les coordonnées consolidées', () => {
    const [place] = irveToPlaces([
      {
        id_station_itinerance: 'FRS3',
        consolidated_latitude: 47.1,
        consolidated_longitude: 0.5,
        coordonneesXY: '[9, 9]',
      },
    ]);
    expect(place).toMatchObject({ lat: 47.1, lng: 0.5 });
  });
});
