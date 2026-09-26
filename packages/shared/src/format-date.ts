import { fr } from 'date-fns/locale';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

/** Toutes les dates affichees aux agents et aux habitants sont en heure de Paris. */
export const PARIS_TIME_ZONE = 'Europe/Paris';

/** Format par defaut : « 25 septembre 2026 a 14:30 ». */
const DEFAULT_PATTERN = "d MMMM yyyy 'a' HH:mm";

/**
 * Formate une date en francais, dans le fuseau Europe/Paris.
 * Le decalage (CET/CEST) est resolu par `date-fns-tz`, y compris pendant les
 * changements d'heure.
 */
export function formatDateFr(date: Date, pattern: string = DEFAULT_PATTERN): string {
  return formatInTimeZone(date, PARIS_TIME_ZONE, pattern, { locale: fr });
}

/** Valeur d'un champ `datetime-local` (heure de Paris) a partir d'un ISO UTC. */
export function isoToParisInput(iso: string | null): string {
  return iso ? formatInTimeZone(new Date(iso), PARIS_TIME_ZONE, "yyyy-MM-dd'T'HH:mm") : '';
}

/** ISO UTC a partir d'une saisie `datetime-local` exprimee en heure de Paris. */
export function parisInputToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  return fromZonedTime(value, PARIS_TIME_ZONE).toISOString();
}

/** « 12 octobre à 8 h 00 » : date lisible sans l'annee courante. */
export function formatDateTimeLongFr(date: Date, now: Date = new Date()): string {
  const sameYear = formatInTimeZone(date, PARIS_TIME_ZONE, 'yyyy') === formatInTimeZone(now, PARIS_TIME_ZONE, 'yyyy');
  const day = formatInTimeZone(date, PARIS_TIME_ZONE, sameYear ? 'd MMMM' : 'd MMMM yyyy', { locale: fr });
  const hours = formatInTimeZone(date, PARIS_TIME_ZONE, "H 'h' mm");
  return `${day} à ${hours}`;
}

export function formatNumberFr(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits }).format(value);
}
