import { NotFoundError } from '@app/data';
import { allowedReportTransitions, can, formatDateFr, REPORT_EVENT_VISIBILITY_LABELS, REPORT_PRIORITY_LABELS, REPORT_STATUS_LABELS } from '@app/shared';
import { Copy, Eye, Lock, Mail, Navigation } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { cn } from '@/lib/utils';
import { authorNames } from '@/server/content';
import { requirePermission } from '@/server/guards';
import { getRepos } from '@/server/repos';

import { OverdueBadge } from '../reports-table';
import { PhotoGallery } from './photo-gallery';
import { ReportActions } from './report-actions';
import { ReportMiniMap } from './report-mini-map';

export const metadata: Metadata = { title: 'Signalement' };

export default async function ReportDetailPage({ params }: PageProps<'/[tenant]/signalements/[id]'>) {
  const { tenant: slug, id } = await params;
  const { session, tenant, ctx } = await requirePermission(slug, 'reports', 'read');
  const repos = getRepos();
  const detail = await repos.reports.get(ctx, id).catch((error: unknown) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });
  const { report, ageDays, overdue, events, reporterAlias } = detail;
  const canEdit = can(session, tenant.id, 'reports', 'edit');
  const readOnly = report.status === 'duplicate';
  const [categories, services, names, nearby, original] = await Promise.all([
    repos.reportCategories.list(ctx),
    repos.services.list(ctx),
    authorNames(ctx),
    canEdit && !readOnly ? repos.reports.nearby(ctx, id, 100) : Promise.resolve([]),
    report.duplicateOfId ? repos.reports.get(ctx, report.duplicateOfId).catch(() => null) : Promise.resolve(null),
  ]);
  const category = categories.find((c) => c.id === report.categoryId);
  const transitions = readOnly ? [] : allowedReportTransitions(session, tenant.id, report.status).filter((s) => s !== 'duplicate');

  return (
    <>
      <PageHeader title={`Signalement ${report.reference}`} description={category?.label} />

      <dl className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <dt className="text-muted-foreground">Statut</dt>
          <dd>
            <StatusBadge kind="report" status={report.status} />
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="text-muted-foreground">Priorité</dt>
          <dd className="font-medium">{REPORT_PRIORITY_LABELS[report.priority]}</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="text-muted-foreground">Catégorie</dt>
          <dd className="font-medium">{category?.label ?? '—'}</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="text-muted-foreground">Âge</dt>
          <dd className="flex items-center gap-2 font-medium">
            {ageDays} jour{ageDays > 1 ? 's' : ''}
            {overdue ? <OverdueBadge /> : null}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="text-muted-foreground">Service</dt>
          <dd className="font-medium">{services.find((s) => s.id === report.serviceId)?.name ?? 'Non assigné'}</dd>
        </div>
      </dl>

      {readOnly ? (
        <p role="status" className="mb-6 flex items-center gap-2 rounded-md border border-zinc-300 bg-zinc-100 p-3 text-sm text-zinc-800">
          <Copy className="size-4" aria-hidden="true" />
          Ce signalement est un doublon, en lecture seule.{' '}
          {original ? (
            <Link href={`/${slug}/signalements/${original.report.id}`} className="font-medium underline">
              Voir le signalement d’origine {original.report.reference}
            </Link>
          ) : null}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section aria-labelledby="description-titre" className="space-y-2">
            <h2 id="description-titre" className="text-lg font-semibold">
              Description
            </h2>
            <p className="whitespace-pre-line">{report.description}</p>
            <p className="text-muted-foreground text-sm">
              Envoyé le {formatDateFr(new Date(report.createdAt), "d MMMM yyyy 'à' H'h'mm")} par {reporterAlias ?? 'un habitant'}
            </p>
            {report.contactEmail ? (
              <p className="flex items-center gap-2 text-sm">
                <Mail className="size-4" aria-hidden="true" />
                L’habitant souhaite être recontacté :{' '}
                <a href={`mailto:${report.contactEmail}`} className="underline">
                  {report.contactEmail}
                </a>
              </p>
            ) : null}
          </section>

          <PhotoGallery photos={report.photos} reference={report.reference} />

          <section aria-labelledby="chronologie-titre" className="space-y-3">
            <h2 id="chronologie-titre" className="text-lg font-semibold">
              Chronologie
            </h2>
            {events.length === 0 ? <p className="text-muted-foreground text-sm">Aucun événement pour l’instant.</p> : null}
            <ol className="space-y-3">
              {events.map((e) => {
                const isPublic = e.visibility === 'public';
                const what =
                  e.kind === 'status_change' && e.toStatus
                    ? `Statut : ${e.fromStatus ? `${REPORT_STATUS_LABELS[e.fromStatus]} → ` : ''}${REPORT_STATUS_LABELS[e.toStatus]}`
                    : e.kind === 'assignment'
                      ? 'Assignation'
                      : 'Note';
                return (
                  <li
                    key={e.id}
                    className={cn(
                      'rounded-md border p-3 text-sm',
                      isPublic ? 'border-blue-300 bg-blue-50/60' : 'border-dashed border-amber-400 bg-amber-50/60',
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{what}</p>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium',
                          isPublic ? 'bg-blue-100 text-blue-900' : 'bg-amber-100 text-amber-900',
                        )}
                      >
                        {isPublic ? <Eye className="size-3" aria-hidden="true" /> : <Lock className="size-3" aria-hidden="true" />}
                        {REPORT_EVENT_VISIBILITY_LABELS[e.visibility]}
                      </span>
                    </div>
                    {e.message ? <p className="mt-1 whitespace-pre-line">{e.message}</p> : null}
                    <p className="text-muted-foreground mt-1 text-xs">
                      {formatDateFr(new Date(e.createdAt), "d MMM yyyy 'à' H'h'mm")}
                      {e.authorId ? ` · ${names.get(e.authorId) ?? 'Membre du personnel'}` : ''}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <aside className="space-y-6" aria-label="Localisation et actions">
          <section aria-labelledby="lieu-titre" className="space-y-2">
            <h2 id="lieu-titre" className="text-lg font-semibold">
              Localisation
            </h2>
            <ReportMiniMap point={report.point} reference={report.reference} address={report.address} />
            <p className="text-sm">{report.address}</p>
            <a
              href={`https://www.openstreetmap.org/directions?to=${report.point.lat}%2C${report.point.lng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium underline"
            >
              <Navigation className="size-4" aria-hidden="true" />
              Ouvrir dans un itinéraire
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
          </section>

          {canEdit && !readOnly ? (
            <ReportActions
              slug={slug}
              reportId={report.id}
              status={report.status}
              priority={report.priority}
              serviceId={report.serviceId}
              transitions={transitions}
              services={services.map((s) => ({ id: s.id, name: s.name }))}
              nearby={nearby.map((n) => ({
                id: n.report.id,
                reference: n.report.reference,
                address: n.report.address,
                distanceM: n.distanceM,
                status: n.report.status,
              }))}
            />
          ) : null}
        </aside>
      </div>
    </>
  );
}
