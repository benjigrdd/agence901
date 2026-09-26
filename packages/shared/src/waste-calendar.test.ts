import { describe, expect, it } from 'vitest';

import { computeNextCollections, weeklyCollectionRule } from './waste-calendar';

const ZONE = '00000000-0000-4000-8000-0000000000a1';

describe('computeNextCollections', () => {
  const household = {
    id: '00000000-0000-4000-8000-000000000101',
    zoneId: ZONE,
    wasteType: 'household' as const,
    rrule: weeklyCollectionRule('2026-01-07', 'WE'),
    exceptions: [
      { date: '2026-11-11', movedTo: '2026-11-12' },
      { date: '2026-12-30', movedTo: null },
    ],
  };
  const recycling = {
    id: '00000000-0000-4000-8000-000000000102',
    zoneId: ZONE,
    wasteType: 'recycling' as const,
    rrule: weeklyCollectionRule('2026-01-05', 'MO', 2),
    exceptions: [],
  };

  it('renvoie les 8 prochaines collectes triées, exceptions appliquées', () => {
    const next = computeNextCollections([household, recycling], new Date('2026-11-01T10:00:00Z'), 8);
    // Emballages une semaine sur deux depuis le lundi 5 janvier : 9 et 23 novembre, 7 decembre.
    expect(next.map((o) => `${o.date}:${o.wasteType}`)).toEqual([
      '2026-11-04:household',
      '2026-11-09:recycling',
      '2026-11-12:household',
      '2026-11-18:household',
      '2026-11-23:recycling',
      '2026-11-25:household',
      '2026-12-02:household',
      '2026-12-07:recycling',
    ]);
    expect(next.find((o) => o.date === '2026-11-12')?.movedFrom).toBe('2026-11-11');
    expect(next.some((o) => o.date === '2026-11-11')).toBe(false);
  });

  it('supprime une collecte annulée', () => {
    const next = computeNextCollections([household], new Date('2026-12-20T10:00:00Z'), 3);
    expect(next.map((o) => o.date)).toEqual(['2026-12-23', '2027-01-06', '2027-01-13']);
  });

  it('inclut le jour même (heure de Paris)', () => {
    const next = computeNextCollections([household], new Date('2026-11-03T23:30:00Z'), 1);
    expect(next[0]?.date).toBe('2026-11-04');
  });
});
