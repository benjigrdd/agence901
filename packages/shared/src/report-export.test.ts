import { describe, expect, it } from 'vitest';

import { buildReportsCsv, REPORT_CSV_HEADERS } from './report-export';

const report = {
  id: 'r1',
  reference: '2026-00042',
  createdAt: '2026-09-01T08:00:00.000Z',
  categoryId: 'c1',
  address: '12 rue des Écoles; Alpha',
  status: 'in_progress' as const,
  serviceId: 's1',
  contactEmail: 'habitant@example.fr',
  reporterId: '0b7c1d2e-0000-4000-8000-000000000001',
  description: '=HYPERLINK("x")',
};

describe('export CSV des signalements', () => {
  const csv = buildReportsCsv([{ report, ageDays: 5 }], {
    categories: new Map([['c1', 'Voirie']]),
    services: new Map([['s1', 'Services techniques']]),
  });

  it('contient les colonnes attendues', () => {
    expect(csv.startsWith('\uFEFF')).toBe(true);
    const [header, line] = csv.slice(1).split('\r\n');
    expect(header).toBe(REPORT_CSV_HEADERS.join(';'));
    expect(line).toBe('2026-00042;2026-09-01;Voirie;"12 rue des Écoles; Alpha";En cours;Services techniques;5');
  });

  it('ne contient aucune donnee personnelle', () => {
    expect(csv).not.toContain('habitant@example.fr');
    expect(csv).not.toContain(report.reporterId);
    expect(csv).not.toContain('HYPERLINK');
    expect(REPORT_CSV_HEADERS.join(' ').toLowerCase()).not.toMatch(/mail|habitant|identifiant/);
  });

  it('neutralise les formules', () => {
    const out = buildReportsCsv([{ report: { ...report, address: '=1+1' }, ageDays: 0 }], { categories: new Map(), services: new Map() });
    expect(out).toContain("'=1+1");
  });
});
