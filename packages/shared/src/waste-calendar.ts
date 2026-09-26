import { formatInTimeZone } from 'date-fns-tz';
import { rrulestr } from 'rrule';

import type { WasteType } from './enums';
import { PARIS_TIME_ZONE } from './format-date';
import type { WasteSchedule } from './schemas/waste-schedule';

export type WasteScheduleLike = Pick<WasteSchedule, 'id' | 'zoneId' | 'wasteType' | 'rrule' | 'exceptions'>;

export type CollectionOccurrence = {
  date: string;
  wasteType: WasteType;
  scheduleId: string;
  /** Date initiale si la collecte a ete reportee. */
  movedFrom: string | null;
};

const HORIZON_DAYS = 400;

const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Prochaines collectes a partir de `from` (jour de Paris inclus), exceptions appliquees :
 * une date annulee disparait, une date reportee est deplacee.
 */
export function computeNextCollections(
  schedules: readonly WasteScheduleLike[],
  from: Date,
  count: number,
): CollectionOccurrence[] {
  const fromDay = formatInTimeZone(from, PARIS_TIME_ZONE, 'yyyy-MM-dd');
  const start = new Date(`${fromDay}T00:00:00Z`);
  const end = new Date(start.getTime() + HORIZON_DAYS * 86_400_000);
  const occurrences: CollectionOccurrence[] = [];

  for (const schedule of schedules) {
    const exceptions = new Map(schedule.exceptions.map((e) => [e.date, e.movedTo]));
    const dates = rrulestr(schedule.rrule).between(start, end, true).map(toIsoDate);
    for (const date of dates) {
      if (!exceptions.has(date)) {
        occurrences.push({ date, wasteType: schedule.wasteType, scheduleId: schedule.id, movedFrom: null });
        continue;
      }
      const movedTo = exceptions.get(date);
      if (movedTo && movedTo >= fromDay) {
        occurrences.push({ date: movedTo, wasteType: schedule.wasteType, scheduleId: schedule.id, movedFrom: date });
      }
    }
  }

  return occurrences
    .filter((o) => o.date >= fromDay)
    .sort((a, b) => a.date.localeCompare(b.date) || a.wasteType.localeCompare(b.wasteType))
    .slice(0, count);
}

/** RRULE hebdomadaire (ou toutes les N semaines) sur un jour de la semaine, depuis une date. */
export function weeklyCollectionRule(startDate: string, weekday: 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA', interval = 1): string {
  const dtstart = startDate.replaceAll('-', '');
  return `DTSTART:${dtstart}T000000Z\nRRULE:FREQ=WEEKLY;INTERVAL=${interval};BYDAY=${weekday}`;
}
