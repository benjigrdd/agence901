/**
 * Horaires d'ouverture au format OSM `opening_hours`, pour les cas simples :
 * plages horaires par jour de semaine, jours fermes, « 24/7 ».
 * Les expressions plus riches (jours feries, saisons...) ne sont pas relues : `parseOpeningHours` renvoie null.
 */

export const WEEKDAY_KEYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export const WEEKDAY_LABELS_FR: Record<WeekdayKey, string> = {
  Mo: 'Lundi',
  Tu: 'Mardi',
  We: 'Mercredi',
  Th: 'Jeudi',
  Fr: 'Vendredi',
  Sa: 'Samedi',
  Su: 'Dimanche',
};

/** Heures au format HH:MM. */
export type TimeRange = { from: string; to: string };

export type WeeklyHours = {
  alwaysOpen: boolean;
  /** Tableau vide = ferme ce jour-la. */
  days: Record<WeekdayKey, TimeRange[]>;
};

/** Jour d'indice `k` (0 = lundi) ; les appelants bornent `k` a la semaine. */
function dayAt(k: number): WeekdayKey {
  const day = WEEKDAY_KEYS[k];
  if (!day) throw new RangeError(`Jour hors semaine : ${k}`);
  return day;
}

const dayIndex = (value: string | undefined) => WEEKDAY_KEYS.findIndex((k) => k === value);

const TIME = /^([01]\d|2[0-4]):[0-5]\d$/;
const RANGE = /^(\d{2}:\d{2})-(\d{2}:\d{2})$/;

export function emptyWeeklyHours(): WeeklyHours {
  return { alwaysOpen: false, days: { Mo: [], Tu: [], We: [], Th: [], Fr: [], Sa: [], Su: [] } };
}

/** Messages d'erreur par jour (plage invalide ou fin avant debut). */
export function openingHoursErrors(hours: WeeklyHours): Partial<Record<WeekdayKey, string>> {
  const errors: Partial<Record<WeekdayKey, string>> = {};
  if (hours.alwaysOpen) return errors;
  for (const day of WEEKDAY_KEYS) {
    for (const r of hours.days[day]) {
      if (!TIME.test(r.from) || !TIME.test(r.to)) errors[day] = 'Heure invalide (HH:MM)';
      else if (r.from >= r.to) errors[day] = 'L’heure de fin doit suivre l’heure de début';
    }
  }
  return errors;
}

const rangesKey = (ranges: TimeRange[]) => ranges.map((r) => `${r.from}-${r.to}`).join(',');

/** Serialise en `opening_hours` ; null si aucun horaire. Les jours consecutifs identiques sont regroupes. */
export function serializeOpeningHours(hours: WeeklyHours): string | null {
  if (hours.alwaysOpen) return '24/7';
  const rules: string[] = [];
  let i = 0;
  while (i < WEEKDAY_KEYS.length) {
    const start = dayAt(i);
    const key = rangesKey(hours.days[start]);
    let j = i;
    while (j + 1 < WEEKDAY_KEYS.length && rangesKey(hours.days[dayAt(j + 1)]) === key) j++;
    if (key) {
      const end = dayAt(j);
      const days = j === i ? start : j === i + 1 ? `${start},${end}` : `${start}-${end}`;
      rules.push(`${days} ${key}`);
    }
    i = j + 1;
  }
  return rules.length ? rules.join('; ') : null;
}

function parseDays(selector: string): WeekdayKey[] | null {
  const days: WeekdayKey[] = [];
  for (const part of selector.split(',')) {
    const [a, b] = part.split('-');
    const from = dayIndex(a);
    if (from < 0) return null;
    if (b === undefined) {
      days.push(dayAt(from));
      continue;
    }
    const to = dayIndex(b);
    if (to < from) return null;
    for (let k = from; k <= to; k++) days.push(dayAt(k));
  }
  return days;
}

/** Relit une expression simple ; null si elle depasse ce que l'editeur sait representer. */
export function parseOpeningHours(value: string | null): WeeklyHours | null {
  const result = emptyWeeklyHours();
  const text = value?.trim() ?? '';
  if (!text) return result;
  if (text === '24/7') return { ...result, alwaysOpen: true };
  for (const rule of text.split(';').map((r) => r.trim()).filter(Boolean)) {
    const match = /^(\S+)\s+(.+)$/.exec(rule);
    if (!match) return null;
    const days = parseDays(match[1] ?? '');
    if (!days) return null;
    const spec = (match[2] ?? '').trim();
    if (spec === 'off' || spec === 'closed') {
      for (const d of days) result.days[d] = [];
      continue;
    }
    const ranges: TimeRange[] = [];
    for (const part of spec.split(',')) {
      const r = RANGE.exec(part.trim());
      if (!r || !TIME.test(r[1] ?? '') || !TIME.test(r[2] ?? '')) return null;
      ranges.push({ from: r[1] ?? '', to: r[2] ?? '' });
    }
    for (const d of days) result.days[d] = ranges.map((x) => ({ ...x }));
  }
  return result;
}

/** Lignes lisibles (« Lundi : 9 h 00 – 12 h 00 ») ; l'expression brute si elle n'est pas relisible. */
export function describeOpeningHoursFr(value: string | null): string[] {
  if (!value?.trim()) return ['Horaires non renseignés'];
  const hours = parseOpeningHours(value);
  if (!hours) return [value];
  if (hours.alwaysOpen) return ['Ouvert 24 h/24, 7 j/7'];
  const time = (t: string) => t.replace(/^0(\d)/, '$1').replace(':', ' h ');
  return WEEKDAY_KEYS.map((d) => {
    const ranges = hours.days[d];
    return `${WEEKDAY_LABELS_FR[d]} : ${ranges.length ? ranges.map((r) => `${time(r.from)} – ${time(r.to)}`).join(', ') : 'fermé'}`;
  });
}
