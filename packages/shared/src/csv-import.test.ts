import { describe, expect, it } from 'vitest';

import { parseCsv } from './csv';
import {
  applyCsvMapping,
  CSV_IMPORT_ENTITIES,
  CSV_IMPORT_SPECS,
  csvErrorReport,
  csvTemplate,
  parseParisDateTime,
  suggestCsvMapping,
  validateCsvRows,
} from './csv-import';

const ctx = {
  placeCategories: [
    { id: '11111111-1111-4111-8111-111111111111', key: 'culture', label: 'Culture' },
  ],
};

describe('modèles CSV', () => {
  it.each(CSV_IMPORT_ENTITIES)(
    '%s : en-têtes FR, une ligne d’exemple valide et reconnue automatiquement',
    (entity) => {
      const table = parseCsv(csvTemplate(entity));
      expect(table.headers).toEqual(CSV_IMPORT_SPECS[entity].columns.map((c) => c.header));
      expect(table.rows).toHaveLength(1);
      const mapping = suggestCsvMapping(entity, table.headers);
      expect(Object.values(mapping).every(Boolean)).toBe(true);
      const { valid, errors } = validateCsvRows(entity, applyCsvMapping(table.rows, mapping), ctx);
      expect(errors).toEqual([]);
      expect(valid).toHaveLength(1);
    },
  );
});

describe('correspondance des colonnes', () => {
  it('reconnaît les noms usuels, sans accent ni casse', () => {
    expect(
      suggestCsvMapping('events', ['Titre', 'Date de début', 'Date de fin', 'Lieu']),
    ).toMatchObject({
      title: 'Titre',
      startsAt: 'Date de début',
      endsAt: 'Date de fin',
      location: 'Lieu',
      organizer: '',
    });
  });
});

describe('parseParisDateTime', () => {
  it.each([
    ['21/06/2027 18:00', { local: '2027-06-21T18:00', dateOnly: false }],
    ['21/06/2027 18h30', { local: '2027-06-21T18:30', dateOnly: false }],
    ['1/6/2027', { local: '2027-06-01T00:00', dateOnly: true }],
    ['2027-06-21T09:15', { local: '2027-06-21T09:15', dateOnly: false }],
  ])('%s', (value, expected) => {
    expect(parseParisDateTime(value)).toEqual(expected);
  });

  it.each(['31/02/2027', '21/06/2027 25:00', 'demain', ''])('rejette « %s »', (value) => {
    expect(parseParisDateTime(value)).toBeNull();
  });
});

describe('validation ligne par ligne', () => {
  it('événements : garde les lignes valides et rapporte chaque erreur avec son numéro de ligne', () => {
    const rows: Record<string, string>[] = [
      {
        title: 'Concert',
        startsAt: '21/06/2027 18:00',
        endsAt: '21/06/2027 23:00',
        category: 'Culture',
      },
      { title: 'Brocante', startsAt: '32/13/2027', category: '' },
      { title: '', startsAt: '01/07/2027', category: '' },
      { title: 'Tournoi', startsAt: '02/07/2027 10:00', category: 'Pétanque' },
      { title: 'Marché', startsAt: '03/07/2027', category: 'Vie municipale' },
    ];
    const { valid, errors } = validateCsvRows('events', rows, ctx);
    expect(valid.map((v) => v.line)).toEqual([2, 6]);
    expect(errors).toEqual([
      { line: 3, column: 'Date de début', message: 'date de début invalide' },
      { line: 4, column: 'Titre', message: 'Titre : Ce champ est obligatoire' },
      { line: 5, column: 'Catégorie', message: 'catégorie inconnue « Pétanque »' },
    ]);
  });

  it('événements : heure de Paris convertie en UTC (été), journée entière déduite des dates sans heure', () => {
    const { valid } = validateCsvRows(
      'events',
      [
        { title: 'Concert', startsAt: '21/06/2027 18:00' },
        { title: 'Fête', startsAt: '14/07/2027' },
      ],
      ctx,
    );
    expect(valid[0]?.value).toMatchObject({
      startsAt: '2027-06-21T16:00:00.000Z',
      endsAt: '2027-06-21T18:00:00.000Z',
      allDay: false,
      category: 'other',
    });
    expect(valid[1]?.value).toMatchObject({
      startsAt: '2027-07-13T22:00:00.000Z',
      endsAt: '2027-07-14T21:59:00.000Z',
      allDay: true,
    });
  });

  it('lieux : adresse sans coordonnées à géocoder, coordonnées françaises, identifiant externe', () => {
    const { valid, errors } = validateCsvRows(
      'places',
      [
        { name: 'Médiathèque', category: 'culture', address: '2 rue Haute', externalId: 'M1' },
        { name: 'Théâtre', category: 'Culture', address: '1 place', lat: '47,39', lng: '0,68' },
        { name: 'Cinéma', category: 'Culture', address: '3 rue', lat: '47,39', lng: '' },
      ],
      ctx,
    );
    expect(valid[0]).toMatchObject({
      line: 2,
      geocode: '2 rue Haute',
      value: { source: 'csv', externalId: 'M1' },
    });
    expect(valid[1]).toMatchObject({
      line: 3,
      geocode: null,
      value: { point: { lat: 47.39, lng: 0.68 } },
    });
    expect(errors).toEqual([{ line: 4, column: 'Latitude', message: 'coordonnées invalides' }]);
  });

  it('démarches et consignes : type déduit de la valeur, bac reconnu par son libellé', () => {
    expect(
      validateCsvRows(
        'procedures',
        [{ title: 'Carte d’identité', description: 'Sur rendez-vous', value: 'mairie@exemple.fr' }],
        ctx,
      ).valid[0]?.value,
    ).toMatchObject({ kind: 'email', category: 'other' });
    const sorting = validateCsvRows(
      'sortingGuide',
      [
        { name: 'Canette', bin: 'emballages', advice: 'Bien vider' },
        { name: 'Pile', bin: 'Lune', advice: 'x' },
      ],
      ctx,
    );
    expect(sorting.valid).toHaveLength(1);
    expect(sorting.errors[0]).toMatchObject({
      line: 3,
      message: 'bac ou filière inconnu « Lune »',
    });
  });
});

describe('rapport d’erreurs', () => {
  it('un CSV ligne, colonne, erreur', () => {
    expect(
      csvErrorReport([{ line: 14, column: 'Date de début', message: 'date de début invalide' }]),
    ).toBe('\uFEFFligne;colonne;erreur\r\n14;Date de début;date de début invalide\r\n');
  });
});
