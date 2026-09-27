import { describe, expect, it } from 'vitest';

import { OSM_CATEGORY_KEYS, osmCategory, osmElementToPlace, overpassQuery } from './osm-mapping';

describe('osmCategory', () => {
  it.each([
    [{ amenity: 'toilets' }, 'toilettes'],
    [{ amenity: 'drinking_water' }, 'fontaine'],
    [{ amenity: 'parking' }, 'parking'],
    [{ leisure: 'park' }, 'parc'],
    [{ leisure: 'garden' }, 'parc'],
    [{ leisure: 'sports_centre' }, 'equipement-sportif'],
    [{ leisure: 'pitch' }, 'equipement-sportif'],
    [{ leisure: 'swimming_pool' }, 'equipement-sportif'],
    [{ amenity: 'townhall' }, 'mairie'],
    [{ amenity: 'school' }, 'ecole'],
    [{ amenity: 'kindergarten' }, 'ecole'],
    [{ amenity: 'library' }, 'culture'],
    [{ amenity: 'theatre' }, 'culture'],
    [{ amenity: 'arts_centre' }, 'culture'],
    [{ amenity: 'recycling', recycling_type: 'centre' }, 'decheterie'],
    [{ amenity: 'pharmacy' }, 'sante'],
    [{ amenity: 'doctors' }, 'sante'],
    [{ amenity: 'charging_station' }, 'borne-recharge'],
  ])('%o → %s', (tags, key) => {
    expect(osmCategory(tags)?.categoryKey).toBe(key);
  });

  it('une aire de jeux est un parc de sous-type « aire de jeux »', () => {
    expect(osmCategory({ leisure: 'playground' })).toEqual({
      categoryKey: 'parc',
      subtype: 'aire-de-jeux',
    });
  });

  it('ignore les etiquettes hors correspondance (conteneur de tri, banc)', () => {
    expect(osmCategory({ amenity: 'recycling', recycling_type: 'container' })).toBeNull();
    expect(osmCategory({ amenity: 'bench' })).toBeNull();
    expect(osmCategory({})).toBeNull();
  });
});

describe('osmElementToPlace', () => {
  it('reprend nom, horaires, accessibilite et identifiant externe', () => {
    const place = osmElementToPlace(
      {
        type: 'node',
        id: 123,
        lat: 47.39,
        lon: 0.69,
        tags: {
          amenity: 'toilets',
          name: 'Toilettes du marché',
          opening_hours: 'Mo-Su 08:00-20:00',
          wheelchair: 'yes',
        },
      },
      'Alpha',
    );
    expect(place).toMatchObject({
      externalId: 'node/123',
      categoryKey: 'toilettes',
      name: 'Toilettes du marché',
      openingHours: 'Mo-Su 08:00-20:00',
      wheelchair: 'yes',
      address: 'Alpha',
    });
  });

  it('libelle generique sans nom, centre des chemins, adresse OSM', () => {
    const place = osmElementToPlace(
      {
        type: 'way',
        id: 456,
        center: { lat: 47.4, lon: 0.7 },
        tags: { amenity: 'toilets', 'addr:housenumber': '2', 'addr:street': 'rue Haute' },
      },
      'Alpha',
    );
    expect(place).toMatchObject({
      externalId: 'way/456',
      name: 'Toilettes publiques',
      lat: 47.4,
      lng: 0.7,
      address: '2 rue Haute, Alpha',
      wheelchair: 'unknown',
    });
  });

  it('ecarte les objets sans position ou hors des categories demandees', () => {
    expect(
      osmElementToPlace({ type: 'way', id: 1, tags: { amenity: 'toilets' } }, 'Alpha'),
    ).toBeNull();
    expect(
      osmElementToPlace(
        { type: 'node', id: 2, lat: 1, lon: 1, tags: { amenity: 'parking' } },
        'Alpha',
        ['toilettes'],
      ),
    ).toBeNull();
  });

  it('refuse un site web non https', () => {
    const place = osmElementToPlace(
      {
        type: 'node',
        id: 3,
        lat: 1,
        lon: 1,
        tags: { amenity: 'library', website: 'http://biblio.test' },
      },
      'Alpha',
    );
    expect(place?.website).toBeNull();
  });
});

describe('overpassQuery', () => {
  it('interroge la commune par code INSEE, uniquement pour les categories demandees', () => {
    const query = overpassQuery('37261', ['toilettes', 'decheterie']);
    expect(query).toContain('area["ref:INSEE"="37261"]');
    expect(query).toContain('[timeout:60]');
    expect(query).toContain('out center');
    expect(query).toContain('"amenity"~"^(toilets)$"');
    expect(query).toContain('["recycling_type"="centre"]');
    expect(query).not.toContain('parking');
  });

  it('neutralise un code INSEE malforme', () => {
    expect(overpassQuery('37"];out;', OSM_CATEGORY_KEYS)).toContain('"ref:INSEE"="37"');
  });
});
