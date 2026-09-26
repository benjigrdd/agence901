import { fr } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';

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
