import type { ReportStatus } from './enums';
import { REPORT_STATUS_LABELS } from './i18n/fr';

/**
 * Export CSV des signalements. Les colonnes sont fixees ici : aucune donnee personnelle
 * (ni email, ni identifiant d'habitant, ni description libre) ne peut y figurer.
 */
export const REPORT_CSV_HEADERS = ['Référence', 'Date', 'Catégorie', 'Adresse', 'Statut', 'Service', 'Délai (jours)'] as const;

export type ReportCsvSource = {
  report: { reference: string; createdAt: string; categoryId: string; address: string; status: ReportStatus; serviceId: string | null };
  ageDays: number;
};

export type ReportCsvLabels = { categories: ReadonlyMap<string, string>; services: ReadonlyMap<string, string> };

function cell(value: string): string {
  // Neutralise les formules des tableurs (injection CSV).
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function buildReportsCsv(items: readonly ReportCsvSource[], labels: ReportCsvLabels): string {
  const lines = items.map(({ report, ageDays }) =>
    [
      report.reference,
      report.createdAt.slice(0, 10),
      labels.categories.get(report.categoryId) ?? '',
      report.address,
      REPORT_STATUS_LABELS[report.status],
      report.serviceId ? (labels.services.get(report.serviceId) ?? '') : '',
      String(ageDays),
    ]
      .map(cell)
      .join(';'),
  );
  // BOM : accents corrects a l'ouverture dans Excel.
  return `\uFEFF${[REPORT_CSV_HEADERS.join(';'), ...lines].join('\r\n')}\r\n`;
}
