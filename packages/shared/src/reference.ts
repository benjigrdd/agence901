export const REPORT_REFERENCE_PATTERN = /^\d{4}-\d{5}$/;

/** Reference lisible d'un signalement : `formatReportReference(2026, 42)` -> `2026-00042`. */
export function formatReportReference(year: number, n: number): string {
  if (!Number.isInteger(year) || year < 2000 || year > 9999) {
    throw new RangeError(`Année invalide : ${year}`);
  }
  if (!Number.isInteger(n) || n < 1 || n > 99_999) {
    throw new RangeError(`Numéro invalide : ${n}`);
  }
  return `${year}-${String(n).padStart(5, '0')}`;
}

export function parseReportReference(reference: string): { year: number; n: number } | null {
  if (!REPORT_REFERENCE_PATTERN.test(reference)) return null;
  const [year, n] = reference.split('-').map(Number);
  return year !== undefined && n !== undefined ? { year, n } : null;
}
