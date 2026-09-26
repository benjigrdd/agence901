import { describe, expect, it } from 'vitest';

import { emptyWeeklyHours, openingHoursErrors, parseOpeningHours, serializeOpeningHours } from './opening-hours';

describe('opening_hours', () => {
  it('regroupe les jours consecutifs identiques', () => {
    const h = emptyWeeklyHours();
    const morningAfternoon = [
      { from: '08:30', to: '12:00' },
      { from: '14:00', to: '17:30' },
    ];
    for (const d of ['Mo', 'Tu', 'We', 'Th', 'Fr'] as const) h.days[d] = morningAfternoon;
    h.days.Sa = [{ from: '09:00', to: '12:00' }];
    expect(serializeOpeningHours(h)).toBe('Mo-Fr 08:30-12:00,14:00-17:30; Sa 09:00-12:00');
  });

  it('gere 24/7, les jours isoles et l’absence d’horaire', () => {
    expect(serializeOpeningHours({ ...emptyWeeklyHours(), alwaysOpen: true })).toBe('24/7');
    expect(serializeOpeningHours(emptyWeeklyHours())).toBeNull();
    const h = emptyWeeklyHours();
    h.days.Mo = [{ from: '10:00', to: '12:00' }];
    h.days.We = [{ from: '10:00', to: '12:00' }];
    h.days.Th = [{ from: '10:00', to: '12:00' }];
    expect(serializeOpeningHours(h)).toBe('Mo 10:00-12:00; We,Th 10:00-12:00');
  });

  it('aller-retour lecture / ecriture', () => {
    for (const s of ['Mo-Fr 08:30-12:00,14:00-17:30; Sa 09:00-12:00', '24/7', 'Tu 14:00-18:00; Su 09:00-12:00', 'Mo 10:00-12:00; We,Th 10:00-12:00']) {
      const parsed = parseOpeningHours(s);
      expect(parsed).not.toBeNull();
      expect(serializeOpeningHours(parsed ?? emptyWeeklyHours())).toBe(s);
    }
  });

  it('relit « off » et refuse les expressions non gerees', () => {
    expect(parseOpeningHours('Mo-Sa 09:00-18:00; We off')?.days.We).toEqual([]);
    expect(parseOpeningHours('Mo-Fr 09:00-18:00; PH off')).toBeNull();
    expect(parseOpeningHours('sunrise-sunset')).toBeNull();
    expect(parseOpeningHours(null)).toEqual(emptyWeeklyHours());
  });

  it('signale les plages invalides', () => {
    const h = emptyWeeklyHours();
    h.days.Mo = [{ from: '14:00', to: '12:00' }];
    h.days.Tu = [{ from: '9h', to: '12:00' }];
    expect(openingHoursErrors(h)).toEqual({ Mo: 'L’heure de fin doit suivre l’heure de début', Tu: 'Heure invalide (HH:MM)' });
  });
});

describe('describeOpeningHoursFr', () => {
  it('decrit chaque jour en francais', async () => {
    const { describeOpeningHoursFr } = await import('./opening-hours');
    expect(describeOpeningHoursFr('Mo 09:00-12:00')[0]).toBe('Lundi : 9 h 00 – 12 h 00');
    expect(describeOpeningHoursFr('Mo 09:00-12:00')[6]).toBe('Dimanche : fermé');
    expect(describeOpeningHoursFr('PH off')).toEqual(['PH off']);
  });
});
