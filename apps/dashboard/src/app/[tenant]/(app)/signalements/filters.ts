import type { ReportFilters } from '@app/data';
import type { ReportPriority, ReportStatus } from '@app/shared';
import { parisInputToIso, REPORT_PRIORITIES, REPORT_STATUSES } from '@app/shared';

export type ReportSearchParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (typeof v === 'string' && v ? v : undefined);
const isStatus = (v: string | undefined): v is ReportStatus => (REPORT_STATUSES as readonly string[]).includes(v ?? '');
const isPriority = (v: string | undefined): v is ReportPriority => (REPORT_PRIORITIES as readonly string[]).includes(v ?? '');

/** Parametres d'URL (en francais) → filtres du depot. Partage entre la liste et l'export CSV. */
export function parseReportFilters(query: ReportSearchParams) {
  const status = one(query.statut);
  const priority = one(query.priorite);
  const from = one(query.du);
  const to = one(query.au);
  const values = {
    statut: isStatus(status) ? status : '',
    categorie: one(query.categorie) ?? '',
    service: one(query.service) ?? '',
    priorite: isPriority(priority) ? priority : '',
    du: from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : '',
    au: to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : '',
    quartier: one(query.quartier) ?? '',
    retard: one(query.retard) === '1',
  };
  const fromIso = values.du ? parisInputToIso(`${values.du}T00:00`) : null;
  const toIso = values.au ? parisInputToIso(`${values.au}T23:59`) : null;
  const filters: ReportFilters = {
    ...(isStatus(status) ? { status: [status] } : {}),
    ...(values.categorie ? { categoryId: [values.categorie] } : {}),
    ...(values.service ? { serviceId: [values.service] } : {}),
    ...(isPriority(priority) ? { priority: [priority] } : {}),
    ...(fromIso ? { from: fromIso } : {}),
    ...(toIso ? { to: toIso } : {}),
    ...(values.quartier ? { districtId: values.quartier } : {}),
    ...(values.retard ? { overdueOnly: true } : {}),
  };
  return { values, filters };
}

export function reportQueryString(values: ReturnType<typeof parseReportFilters>['values'], extra: Record<string, string> = {}): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (key === 'retard') {
      if (value) sp.set('retard', '1');
    } else if (typeof value === 'string' && value) sp.set(key, value);
  }
  for (const [k, v] of Object.entries(extra)) sp.set(k, v);
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}
