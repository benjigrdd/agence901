import type { ReportStatus } from './enums';
import { OPEN_REPORT_STATUSES } from './enums';

const DAY_MS = 86_400_000;
const OPEN: readonly ReportStatus[] = OPEN_REPORT_STATUSES;

/** Age en jours entiers depuis la creation. */
export function reportAgeDays(createdAt: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - Date.parse(createdAt)) / DAY_MS));
}

export function isReportOpen(status: ReportStatus): boolean {
  return OPEN.includes(status);
}

/** En retard : ouvert et plus vieux que le delai cible de sa categorie. */
export function isReportOverdue(
  report: { status: ReportStatus; createdAt: string },
  slaDays: number,
  now: Date,
): boolean {
  return isReportOpen(report.status) && reportAgeDays(report.createdAt, now) > slaDays;
}

/** Pseudonyme stable et non reversible affiche a la place de l'identifiant de l'habitant. */
export function pseudonymizeReporter(reporterId: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < reporterId.length; i++) {
    hash ^= reporterId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const code = ((hash >>> 16) ^ (hash & 0xffff)).toString(16).toUpperCase().padStart(4, '0');
  return `Habitant n° ${code}`;
}
