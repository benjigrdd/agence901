import { AUDIT_ACTION_LABELS, can, formatDateFr, formatNumberFr, isTenantAdmin } from '@app/shared';
import { AlarmClock, CalendarClock, ClipboardCheck, Inbox, Smartphone, Timer, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHeader } from '@/components/page-header';
import { authorNames } from '@/server/content';
import { requireTenant } from '@/server/guards';
import { getRepos } from '@/server/repos';
import { getRequestTime } from '@/server/time';

import { ReportsChart } from './_home/reports-chart';

export const metadata: Metadata = { title: 'Accueil' };

const DAY = 86_400_000;
type Indicator = { label: string; value: string; icon: LucideIcon; href?: string };

export default async function HomePage({ params }: PageProps<'/[tenant]'>) {
  const { tenant: slug } = await params;
  const { session, tenant, ctx } = await requireTenant(slug);
  const repos = getRepos();
  const now = getRequestTime();
  const canReports = can(session, tenant.id, 'reports', 'read');
  const canNews = can(session, tenant.id, 'news', 'read');
  const canEvents = can(session, tenant.id, 'events', 'read');
  const publishNews = can(session, tenant.id, 'news', 'publish');
  const publishEvents = can(session, tenant.id, 'events', 'publish');
  const admin = isTenantAdmin(session, tenant.id);
  const in7Days = new Date(now.getTime() + 7 * DAY).toISOString();
  const nowIso = now.toISOString();

  const [stats, overdue, postsPending, eventsPending, postsScheduled, eventsScheduled, usage, audit, names] = await Promise.all([
    canReports ? repos.reports.stats(ctx) : null,
    canReports ? repos.reports.list(ctx, { filters: { overdueOnly: true }, pageSize: 5 }) : null,
    canNews ? repos.posts.list(ctx, { filters: { status: ['pending_review'] }, pageSize: 50 }) : null,
    canEvents ? repos.events.list(ctx, { filters: { status: ['pending_review'] }, pageSize: 50 }) : null,
    canNews ? repos.posts.list(ctx, { filters: { status: ['scheduled'] }, pageSize: 200 }) : null,
    canEvents ? repos.events.list(ctx, { filters: { status: ['scheduled'] }, pageSize: 200 }) : null,
    repos.usage.daily(ctx, { from: new Date(now.getTime() - 30 * DAY).toISOString().slice(0, 10), to: nowIso.slice(0, 10) }),
    admin ? repos.audit.list(ctx, { pageSize: 8 }) : null,
    authorNames(ctx),
  ]);

  const soon = (publishAt: string | null) => publishAt !== null && publishAt >= nowIso && publishAt <= in7Days;
  const scheduledCount =
    (postsScheduled?.items.filter((p) => soon(p.publishAt)).length ?? 0) + (eventsScheduled?.items.filter((e) => soon(e.publishAt)).length ?? 0);
  const pendingCount = (postsPending?.total ?? 0) + (eventsPending?.total ?? 0);
  const installs = usage.reduce((sum, d) => sum + d.installs, 0);
  const lastDay = usage[usage.length - 1];

  const indicators: Indicator[] = [
    ...(stats
      ? [
          { label: 'Signalements ouverts', value: formatNumberFr(stats.open), icon: Inbox, href: `/${slug}/signalements` },
          { label: 'Signalements en retard', value: formatNumberFr(stats.overdue), icon: AlarmClock, href: `/${slug}/signalements?retard=1` },
          {
            label: 'Délai moyen de résolution (30 jours)',
            value: stats.averageResolutionDays === null ? '—' : `${formatNumberFr(stats.averageResolutionDays)} j`,
            icon: Timer,
          },
        ]
      : []),
    ...(canNews || canEvents
      ? [
          { label: 'Contenus à valider', value: formatNumberFr(pendingCount), icon: ClipboardCheck },
          { label: 'Contenus programmés (7 jours)', value: formatNumberFr(scheduledCount), icon: CalendarClock },
        ]
      : []),
    { label: 'Installations (30 jours)', value: formatNumberFr(installs), icon: Smartphone },
    { label: 'Utilisateurs actifs (dernier jour)', value: formatNumberFr(lastDay?.activeUsers ?? 0), icon: Users },
  ];

  const todo = [
    ...(publishNews ? (postsPending?.items ?? []).map((p) => ({ id: p.id, label: `Actualité à valider : ${p.title}`, href: `/${slug}/actualites/${p.id}` })) : []),
    ...(publishEvents ? (eventsPending?.items ?? []).map((e) => ({ id: e.id, label: `Événement à valider : ${e.title}`, href: `/${slug}/agenda/${e.id}` })) : []),
    ...(overdue?.items ?? []).map(({ report, ageDays }) => ({
      id: report.id,
      label: `Signalement ${report.reference} en retard (${ageDays} jours) : ${report.address}`,
      href: `/${slug}/signalements/${report.id}`,
    })),
  ];

  return (
    <>
      <PageHeader title={`Bonjour, ${tenant.name}`} description="Indicateurs et tâches à traiter." />

      <section aria-labelledby="indicateurs" className="mb-8">
        <h2 id="indicateurs" className="sr-only">
          Indicateurs
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {indicators.map(({ label, value, icon: Icon, href }) => (
            <li key={label} className="bg-card flex items-center gap-3 rounded-lg border p-4">
              <Icon className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-2xl font-semibold">{value}</p>
                {href ? (
                  <Link href={href} className="text-muted-foreground text-sm underline-offset-4 hover:underline">
                    {label}
                  </Link>
                ) : (
                  <p className="text-muted-foreground text-sm">{label}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-8 xl:grid-cols-2">
        {stats ? (
          <section aria-labelledby="graphique-signalements" className="space-y-3">
            <h2 id="graphique-signalements" className="text-lg font-semibold">
              Signalements créés et résolus (12 semaines)
            </h2>
            <ReportsChart
              weeks={stats.weekly.map((w) => ({ label: formatDateFr(new Date(`${w.weekStart}T12:00:00Z`), 'd MMM'), created: w.created, resolved: w.resolved }))}
            />
          </section>
        ) : null}

        {todo.length || canReports || publishNews || publishEvents ? (
          <section aria-labelledby="a-faire" className="space-y-3">
            <h2 id="a-faire" className="text-lg font-semibold">
              À faire
            </h2>
            {todo.length === 0 ? (
              <p className="text-muted-foreground text-sm">Rien à traiter pour le moment.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {todo.map((t) => (
                  <li key={t.id} className="p-3 text-sm">
                    <Link href={t.href} className="underline-offset-4 hover:underline">
                      {t.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {audit ? (
          <section aria-labelledby="dernieres-actions" className="space-y-3">
            <h2 id="dernieres-actions" className="text-lg font-semibold">
              Dernières actions
            </h2>
            <ul className="divide-y rounded-lg border">
              {audit.items.map((a) => (
                <li key={a.id} className="flex flex-wrap justify-between gap-2 p-3 text-sm">
                  <span>
                    {names.get(a.actorId) ?? 'Membre du personnel'} · {AUDIT_ACTION_LABELS[a.action]} · {a.entity}
                  </span>
                  <span className="text-muted-foreground">{formatDateFr(new Date(a.at), "d MMM 'à' H'h'mm")}</span>
                </li>
              ))}
            </ul>
            <Link href={`/${slug}/audit`} className="text-sm underline">
              Voir le journal d’audit
            </Link>
          </section>
        ) : null}
      </div>
    </>
  );
}
