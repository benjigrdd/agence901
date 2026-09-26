import { describe, expect, it } from 'vitest';

import { nonUrgentNotificationsOnDay, requiresNotificationJustification } from './notification-rules';

const n = (createdAt: string, urgent = false, scheduledAt: string | null = null) => ({ createdAt, urgent, scheduledAt });
const now = new Date('2026-10-12T14:00:00.000Z');

describe('regle anti-lassitude', () => {
  it('les 3 premieres notifications non urgentes passent, la 4e exige une justification', () => {
    const sent = [n('2026-10-12T06:00:00.000Z'), n('2026-10-12T09:00:00.000Z')];
    expect(requiresNotificationJustification(sent, { urgent: false, scheduledAt: null }, now)).toBe(false);
    sent.push(n('2026-10-12T12:00:00.000Z'));
    expect(requiresNotificationJustification(sent, { urgent: false, scheduledAt: null }, now)).toBe(true);
  });

  it('les urgentes ne comptent pas et ne sont jamais bloquees', () => {
    const sent = [n('2026-10-12T06:00:00.000Z', true), n('2026-10-12T07:00:00.000Z'), n('2026-10-12T08:00:00.000Z'), n('2026-10-12T09:00:00.000Z')];
    expect(nonUrgentNotificationsOnDay(sent, now)).toBe(3);
    expect(requiresNotificationJustification(sent, { urgent: true, scheduledAt: null }, now)).toBe(false);
  });

  it('compte par jour calendaire a Paris et par jour de programmation', () => {
    // 22 h 30 UTC le 11 = 0 h 30 a Paris le 12.
    const sent = [n('2026-10-11T22:30:00.000Z'), n('2026-10-12T08:00:00.000Z'), n('2026-10-12T09:00:00.000Z')];
    expect(nonUrgentNotificationsOnDay(sent, now)).toBe(3);
    expect(requiresNotificationJustification(sent, { urgent: false, scheduledAt: '2026-10-13T08:00:00.000Z' }, now)).toBe(false);
    const scheduled = [...sent.slice(1), n('2026-10-10T08:00:00.000Z', false, '2026-10-12T16:00:00.000Z')];
    expect(nonUrgentNotificationsOnDay(scheduled, now)).toBe(3);
  });
});
