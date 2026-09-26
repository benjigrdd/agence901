import { describe, expect, it } from 'vitest';

import { expandOccurrences, recurrenceToRRule, rruleToRecurrence } from './recurrence';

describe('recurrenceToRRule / rruleToRecurrence', () => {
  const startsAt = '2026-10-17T07:00:00.000Z'; // samedi 17 octobre, 9 h a Paris

  it('sérialise chaque fréquence avec DTSTART en heure de Paris', () => {
    expect(recurrenceToRRule(startsAt, { frequency: 'none', until: null })).toBeNull();
    expect(recurrenceToRRule(startsAt, { frequency: 'weekly', until: '2026-12-19' })).toBe(
      'DTSTART;TZID=Europe/Paris:20261017T090000\nRRULE:FREQ=WEEKLY;INTERVAL=1;UNTIL=20261219T235959',
    );
    expect(recurrenceToRRule(startsAt, { frequency: 'biweekly', until: null })).toBe(
      'DTSTART;TZID=Europe/Paris:20261017T090000\nRRULE:FREQ=WEEKLY;INTERVAL=2',
    );
    expect(recurrenceToRRule(startsAt, { frequency: 'monthly', until: '2027-03-31' })).toContain(
      'RRULE:FREQ=MONTHLY;UNTIL=20270331T235959',
    );
  });

  it.each([
    { frequency: 'weekly', until: '2026-12-19' },
    { frequency: 'biweekly', until: null },
    { frequency: 'monthly', until: '2027-03-31' },
    { frequency: 'none', until: null },
  ] as const)('fait l’aller-retour pour %o', (form) => {
    expect(rruleToRecurrence(recurrenceToRRule(startsAt, form))).toEqual(form);
  });
});

describe('expandOccurrences', () => {
  it('garde 9 h à Paris après le passage à l’heure d’hiver', () => {
    const rrule = recurrenceToRRule('2026-10-17T07:00:00.000Z', { frequency: 'weekly', until: '2026-11-07' });
    const occ = expandOccurrences(
      { startsAt: '2026-10-17T07:00:00.000Z', endsAt: '2026-10-17T12:00:00.000Z', rrule },
      new Date('2026-10-01T00:00:00Z'),
      new Date('2026-12-31T00:00:00Z'),
    );
    expect(occ.map((o) => o.start.toISOString())).toEqual([
      '2026-10-17T07:00:00.000Z',
      '2026-10-24T07:00:00.000Z',
      '2026-10-31T08:00:00.000Z',
      '2026-11-07T08:00:00.000Z',
    ]);
    expect(occ[2]?.end.toISOString()).toBe('2026-10-31T13:00:00.000Z');
  });

  it('s’arrête à la date de fin et ne renvoie que la période demandée', () => {
    const rrule = recurrenceToRRule('2026-10-17T07:00:00.000Z', { frequency: 'weekly', until: '2026-12-19' });
    const event = { startsAt: '2026-10-17T07:00:00.000Z', endsAt: '2026-10-17T12:00:00.000Z', rrule };
    const november = expandOccurrences(event, new Date('2026-11-01T00:00:00Z'), new Date('2026-11-30T23:59:59Z'));
    expect(november).toHaveLength(4);
    const january = expandOccurrences(event, new Date('2027-01-01T00:00:00Z'), new Date('2027-01-31T00:00:00Z'));
    expect(january).toHaveLength(0);
  });

  it('accepte une RRULE avec DTSTART en UTC (données de démonstration)', () => {
    const event = {
      startsAt: '2026-09-27T07:00:00.000Z',
      endsAt: '2026-09-27T12:00:00.000Z',
      rrule: 'DTSTART:20260927T070000Z\nRRULE:FREQ=WEEKLY;UNTIL=20261220T230000Z',
    };
    const occ = expandOccurrences(event, new Date('2026-10-20T00:00:00Z'), new Date('2026-11-05T00:00:00Z'));
    expect(occ.map((o) => o.start.toISOString())).toEqual([
      '2026-10-25T08:00:00.000Z',
      '2026-11-01T08:00:00.000Z',
    ]);
  });

  it('renvoie un événement ponctuel s’il chevauche la période', () => {
    const event = { startsAt: '2026-10-10T08:00:00Z', endsAt: '2026-10-10T10:00:00Z', rrule: null };
    expect(expandOccurrences(event, new Date('2026-10-01T00:00:00Z'), new Date('2026-10-31T00:00:00Z'))).toHaveLength(1);
    expect(expandOccurrences(event, new Date('2026-11-01T00:00:00Z'), new Date('2026-11-30T00:00:00Z'))).toHaveLength(0);
  });
});
