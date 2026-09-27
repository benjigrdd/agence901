import { describe, expect, it } from 'vitest';

import {
  decodeCsvBytes,
  detectDelimiter,
  findColumn,
  normalizeHeader,
  parseCsv,
  toCsv,
} from './csv';

describe('parseCsv', () => {
  it('lit un CSV Excel français (point-virgule, BOM, guillemets)', () => {
    const t = parseCsv(
      '\uFEFFNom;Adresse;Latitude\r\n"Mairie";"1 place ""du"" Marché; centre";47,39\r\nÉcole;2 rue;47.4\r\n',
    );
    expect(t.headers).toEqual(['Nom', 'Adresse', 'Latitude']);
    expect(t.rows).toEqual([
      { Nom: 'Mairie', Adresse: '1 place "du" Marché; centre', Latitude: '47,39' },
      { Nom: 'École', Adresse: '2 rue', Latitude: '47.4' },
    ]);
  });

  it('détecte la virgule et ignore les lignes vides', () => {
    const t = parseCsv('a,b\n1,2\n\n3,"4\n5"\n');
    expect(t.rows).toEqual([
      { a: '1', b: '2' },
      { a: '3', b: '4\n5' },
    ]);
  });

  it('retrouve les colonnes par alias', () => {
    expect(normalizeHeader('Latitude (WGS84)')).toBe('latitude');
    expect(normalizeHeader('Catégorie')).toBe('categorie');
    expect(findColumn(['Nom du lieu', 'Lat.'], ['lat', 'latitude'])).toBe('Lat.');
  });
});

describe('detectDelimiter', () => {
  it.each([
    ['nom;adresse;ville', ';'],
    ['nom,adresse,ville', ','],
    ['nom\tadresse', '\t'],
    ['"a;b",c,d', ','],
  ])('%s', (line, expected) => {
    expect(detectDelimiter(line)).toBe(expected);
  });
});

describe('decodeCsvBytes', () => {
  it('garde l’UTF-8 valide', () => {
    const r = decodeCsvBytes(new TextEncoder().encode('titre\nFête à l’école'));
    expect(r).toEqual({ text: 'titre\nFête à l’école', encoding: 'utf-8' });
  });

  it('bascule en Windows-1252 (export Excel) et restitue les accents', () => {
    // « Fête d’été » en Windows-1252 : ê = 0xEA, ’ = 0x92, é = 0xE9.
    const bytes = new Uint8Array([0x46, 0xea, 0x74, 0x65, 0x20, 0x64, 0x92, 0xe9, 0x74, 0xe9]);
    expect(decodeCsvBytes(bytes)).toEqual({ text: 'Fête d’été', encoding: 'windows-1252' });
  });
});

describe('toCsv', () => {
  it('ajoute le BOM, protège les séparateurs et neutralise les formules', () => {
    expect(toCsv(['a', 'b'], [['x;y', '=SOMME(A1)']])).toBe('\uFEFFa;b\r\n"x;y";\'=SOMME(A1)\r\n');
  });
});
