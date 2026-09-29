import type { ReportStatus } from '@app/shared';
import { formatDateFr, formatNumberFr, REPORT_PRIORITIES, REPORT_PRIORITY_LABELS, REPORT_STATUS_LABELS, REPORT_STATUSES } from '@app/shared';
import { AlarmClock, Download, Inbox, Timer, Wrench } from 'lucide-react';
import type { Metadata } from 'next';

import { ViewSwitch } from '@/components/map/view-switch';
import { PageHeader } from '@/components/page-header';
import { TruncationNotice } from '@/components/truncation-notice';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { requirePermission } from '@/server/guards';
import { getRepos } from '@/server/repos';

import { parseReportFilters, reportQueryString } from './filters';
import { ReportsMap } from './reports-map';
import type { ReportRow } from './reports-table';
import { ReportsTable } from './reports-table';

export const metadata: Metadata = { title: 'Signalements' };

const SELECT = 'border-input bg-background h-9 rounded-md border px-3 text-sm';

export default async function ReportsPage({ params, searchParams }: PageProps<'/[tenant]/signalements'>) {
  const { tenant: slug } = await params;
  const query = await searchParams;
  const { tenant, ctx } = await requirePermission(slug, 'reports', 'read');
  const { values, filters } = parseReportFilters(query);
  const view = query.vue === 'carte' ? 'carte' : 'liste';
  const repos = getRepos();
  const [list, stats, categories, services, districts] = await Promise.all([
    repos.reports.list(ctx, { filters, pageSize: 500 }),
    repos.reports.stats(ctx),
    repos.reportCategories.list(ctx),
    repos.services.list(ctx),
    repos.districts.list(ctx),
  ]);
  const categoryLabel = new Map(categories.map((c) => [c.id, c.label]));
  const serviceName = new Map(services.map((s) => [s.id, s.name]));

  const rows: ReportRow[] = list.items.map(({ report, ageDays, overdue }) => ({
    id: report.id,
    reference: report.reference,
    category: categoryLabel.get(report.categoryId) ?? '—',
    address: report.address,
    status: report.status,
    priority: report.priority,
    priorityLabel: REPORT_PRIORITY_LABELS[report.priority],
    service: report.serviceId ? (serviceName.get(report.serviceId) ?? '—') : 'Non assigné',
    ageDays,
    overdue,
    createdLabel: formatDateFr(new Date(report.createdAt), 'd MMM yyyy'),
    point: report.point,
  }));

  const indicators = [
    { label: 'Nouveaux', value: formatNumberFr(stats.new), icon: Inbox },
    { label: 'En cours', value: formatNumberFr(stats.inProgress), icon: Wrench },
    { label: 'En retard', value: formatNumberFr(stats.overdue), icon: AlarmClock },
    {
      label: 'Délai moyen de résolution (30 jours)',
      value: stats.averageResolutionDays === null ? '—' : `${formatNumberFr(stats.averageResolutionDays)} j`,
      icon: Timer,
    },
  ];
  const base = `/${slug}/signalements`;
  const { vue: _vue, ...rest } = { ...values, vue: view };
  void _vue;

  return (
    <>
      <PageHeader
        title="Signalements"
        description="Traitez les signalements envoyés par les habitants."
        actions={
          <Button asChild variant="outline">
            <a href={`${base}/export${reportQueryString(rest)}`} download>
              <Download aria-hidden="true" />
              Exporter en CSV
            </a>
          </Button>
        }
      />

      <section aria-labelledby="indicateurs-titre" className="mb-6">
        <h2 id="indicateurs-titre" className="sr-only">
          Indicateurs
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {indicators.map(({ label, value, icon: Icon }) => (
            <li key={label} className="bg-card flex items-center gap-3 rounded-lg border p-4">
              <Icon className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-2xl font-semibold">{value}</p>
                <p className="text-muted-foreground text-sm">{label}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <TruncationNotice shown={list.items.length} total={list.total} hint="Affinez les filtres ou exportez en CSV pour tout consulter." />
      <form method="get" className="mb-4 flex flex-wrap items-end gap-3" aria-label="Filtrer les signalements">
        {view === 'carte' ? <input type="hidden" name="vue" value="carte" /> : null}
        <div className="space-y-1">
          <Label htmlFor="f-statut">Statut</Label>
          <select id="f-statut" name="statut" defaultValue={values.statut} className={SELECT}>
            <option value="">Tous</option>
            {REPORT_STATUSES.map((s: ReportStatus) => (
              <option key={s} value={s}>
                {REPORT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-categorie">Catégorie</Label>
          <select id="f-categorie" name="categorie" defaultValue={values.categorie} className={SELECT}>
            <option value="">Toutes</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-service">Service</Label>
          <select id="f-service" name="service" defaultValue={values.service} className={SELECT}>
            <option value="">Tous</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-priorite">Priorité</Label>
          <select id="f-priorite" name="priorite" defaultValue={values.priorite} className={SELECT}>
            <option value="">Toutes</option>
            {REPORT_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {REPORT_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-quartier">Quartier</Label>
          <select id="f-quartier" name="quartier" defaultValue={values.quartier} className={SELECT}>
            <option value="">Tous</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-du">Du</Label>
          <input id="f-du" type="date" name="du" defaultValue={values.du} className={SELECT} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-au">Au</Label>
          <input id="f-au" type="date" name="au" defaultValue={values.au} className={SELECT} />
        </div>
        <div className="flex h-9 items-center gap-2">
          <input id="f-retard" type="checkbox" name="retard" value="1" defaultChecked={values.retard} className="size-4" />
          <Label htmlFor="f-retard">En retard uniquement</Label>
        </div>
        <Button type="submit" variant="outline">
          Filtrer
        </Button>
      </form>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm" role="status">
          {list.total} signalement{list.total > 1 ? 's' : ''}
        </p>
        <ViewSwitch
          label="Affichage des signalements"
          current={view}
          listHref={`${base}${reportQueryString(values)}`}
          mapHref={`${base}${reportQueryString(values, { vue: 'carte' })}`}
        />
      </div>

      {view === 'carte' ? (
        <ReportsMap slug={slug} center={tenant.center} rows={rows} />
      ) : (
        <ReportsTable slug={slug} rows={rows} />
      )}
    </>
  );
}
