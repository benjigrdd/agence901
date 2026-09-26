import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { RRule } from 'rrule';

import { PARIS_TIME_ZONE } from './format-date';

/*
 * Les recurrences d'evenements sont calculees en heure locale de Paris « flottante » :
 * un marche chaque samedi a 9 h reste a 9 h apres le passage a l'heure d'hiver.
 * rrule travaille sans fuseau (dates UTC utilisees comme heure locale), puis chaque
 * occurrence est reconvertie en instant reel avec `fromZonedTime`.
 */

export const RECURRENCE_FREQUENCIES = ['none', 'weekly', 'biweekly', 'monthly'] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

export const RECURRENCE_FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  none: 'Aucune',
  weekly: 'Chaque semaine',
  biweekly: 'Toutes les 2 semaines',
  monthly: 'Chaque mois',
};

export type RecurrenceForm = {
  frequency: RecurrenceFrequency;
  /** Dernier jour inclus (AAAA-MM-JJ, calendrier de Paris), ou `null` sans fin. */
  until: string | null;
};

const localStamp = (iso: string) => formatInTimeZone(new Date(iso), PARIS_TIME_ZONE, "yyyyMMdd'T'HHmmss");

/** « Heure murale » de Paris representee comme une date UTC (espace de calcul de rrule). */
function wallClock(date: Date): Date {
  const s = formatInTimeZone(date, PARIS_TIME_ZONE, "yyyy-MM-dd'T'HH:mm:ss");
  return new Date(`${s}Z`);
}

function fromWallClock(date: Date): Date {
  return fromZonedTime(date.toISOString().slice(0, 19), PARIS_TIME_ZONE);
}

function parseStamp(stamp: string): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?(Z)?$/.exec(stamp);
  if (!m) return null;
  const [, y, mo, d, h = '00', mi = '00', s = '00', z] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}`;
  // Avec « Z » : instant UTC reel, converti en heure murale de Paris. Sans : deja local.
  return z ? wallClock(new Date(`${iso}Z`)) : new Date(`${iso}Z`);
}

/** Construit la RRULE (avec DTSTART en heure de Paris) a partir du formulaire. */
export function recurrenceToRRule(startsAt: string, form: RecurrenceForm): string | null {
  if (form.frequency === 'none') return null;
  const parts =
    form.frequency === 'monthly'
      ? ['FREQ=MONTHLY']
      : ['FREQ=WEEKLY', `INTERVAL=${form.frequency === 'biweekly' ? 2 : 1}`];
  if (form.until) parts.push(`UNTIL=${form.until.replaceAll('-', '')}T235959`);
  return `DTSTART;TZID=${PARIS_TIME_ZONE}:${localStamp(startsAt)}\nRRULE:${parts.join(';')}`;
}

/** Relit une RRULE produite par `recurrenceToRRule` (ou par les donnees de demonstration). */
export function rruleToRecurrence(rrule: string | null): RecurrenceForm {
  if (!rrule) return { frequency: 'none', until: null };
  const line = rrule.split('\n').find((l) => l.startsWith('RRULE:')) ?? '';
  const params = new Map(
    line
      .slice('RRULE:'.length)
      .split(';')
      .filter(Boolean)
      .map((p) => {
        const [k = '', v = ''] = p.split('=');
        return [k, v] as const;
      }),
  );
  const freq = params.get('FREQ');
  const interval = Number(params.get('INTERVAL') ?? '1');
  const untilRaw = params.get('UNTIL');
  const untilDate = untilRaw ? parseStamp(untilRaw) : null;
  const until = untilDate ? untilDate.toISOString().slice(0, 10) : null;
  if (freq === 'MONTHLY') return { frequency: 'monthly', until };
  if (freq === 'WEEKLY') return { frequency: interval === 2 ? 'biweekly' : 'weekly', until };
  return { frequency: 'none', until: null };
}

export type Occurrence = { start: Date; end: Date };

type RecurringLike = { startsAt: string; endsAt: string; rrule: string | null };

/** Occurrences d'un evenement qui chevauchent `[rangeStart, rangeEnd]`. */
export function expandOccurrences(event: RecurringLike, rangeStart: Date, rangeEnd: Date): Occurrence[] {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const durationMs = Math.max(0, end.getTime() - start.getTime());
  if (!event.rrule) {
    return end >= rangeStart && start <= rangeEnd ? [{ start, end }] : [];
  }
  const lines = event.rrule.split('\n');
  const ruleLine = lines.find((l) => l.startsWith('RRULE:'));
  if (!ruleLine) return [];
  const options = RRule.parseString(ruleLine.slice('RRULE:'.length));
  const dtstartLine = lines.find((l) => l.startsWith('DTSTART'));
  const dtstartStamp = dtstartLine?.split(':').pop() ?? '';
  const dtstart = parseStamp(dtstartStamp) ?? wallClock(start);
  const rule = new RRule({ ...options, dtstart, tzid: null });
  const wallStart = wallClock(new Date(rangeStart.getTime() - durationMs));
  const wallEnd = wallClock(rangeEnd);
  return rule.between(wallStart, wallEnd, true).map((occ) => {
    const occStart = fromWallClock(occ);
    return { start: occStart, end: new Date(occStart.getTime() + durationMs) };
  });
}
