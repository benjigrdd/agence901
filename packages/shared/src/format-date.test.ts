import { describe, expect, it } from 'vitest';

import { formatDateFr } from './format-date';

describe('formatDateFr', () => {
  it('formate une date en francais, en heure de Paris', () => {
    expect(formatDateFr(new Date('2026-09-25T12:30:00Z'))).toBe('25 septembre 2026 a 14:30');
  });

  it('accepte un motif personnalise', () => {
    expect(formatDateFr(new Date('2026-01-05T08:00:00Z'), 'dd/MM/yyyy')).toBe('05/01/2026');
  });

  // Passage a l'heure d'ete : le 29 mars 2026 a 02:00 locale, CET (+1) -> CEST (+2).
  it('applique CET avant le passage a l heure d ete', () => {
    expect(formatDateFr(new Date('2026-03-29T00:30:00Z'), 'HH:mm xxx')).toBe('01:30 +01:00');
  });

  it('applique CEST apres le passage a l heure d ete', () => {
    expect(formatDateFr(new Date('2026-03-29T01:30:00Z'), 'HH:mm xxx')).toBe('03:30 +02:00');
  });

  // Retour a l'heure d'hiver : le 25 octobre 2026, l'heure locale 02:30 existe
  // deux fois (CEST puis CET).
  it('distingue les deux occurrences de 02:30 lors du retour a l heure d hiver', () => {
    expect(formatDateFr(new Date('2026-10-25T00:30:00Z'), 'HH:mm xxx')).toBe('02:30 +02:00');
    expect(formatDateFr(new Date('2026-10-25T01:30:00Z'), 'HH:mm xxx')).toBe('02:30 +01:00');
  });
});

describe('champs datetime-local en heure de Paris', () => {
  it('fait l aller-retour ISO UTC <-> saisie locale, y compris en hiver', async () => {
    const { isoToParisInput, parisInputToIso } = await import('./format-date');
    expect(isoToParisInput('2026-10-12T06:00:00.000Z')).toBe('2026-10-12T08:00');
    expect(parisInputToIso('2026-10-12T08:00')).toBe('2026-10-12T06:00:00.000Z');
    expect(parisInputToIso('2026-12-12T08:00')).toBe('2026-12-12T07:00:00.000Z');
    expect(parisInputToIso('pas une date')).toBeNull();
    expect(isoToParisInput(null)).toBe('');
  });

  it('formate « 12 octobre à 8 h 00 »', async () => {
    const { formatDateTimeLongFr } = await import('./format-date');
    expect(formatDateTimeLongFr(new Date('2026-10-12T06:00:00Z'), new Date('2026-09-26T10:00:00Z'))).toBe('12 octobre à 8 h 00');
  });
});
