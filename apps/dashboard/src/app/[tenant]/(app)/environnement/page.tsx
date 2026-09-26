import { can, describeOpeningHoursFr, formatDateFr, WASTE_TYPE_LABELS } from '@app/shared';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';

import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';
import { requirePermission } from '@/server/guards';
import { getRepos } from '@/server/repos';
import { getRequestTime } from '@/server/time';

import { SchedulesManager } from './schedules-manager';
import { SortingGuideManager } from './sorting-guide-manager';
import { ZonesManager } from './zones-manager';

export const metadata: Metadata = { title: 'Environnement' };

const TABS = [
  { key: 'zones', label: 'Zones de collecte' },
  { key: 'calendrier', label: 'Calendrier' },
  { key: 'tri', label: 'Consignes de tri' },
  { key: 'decheteries', label: 'Déchèteries' },
] as const;

export default async function EnvironmentPage({ params, searchParams }: PageProps<'/[tenant]/environnement'>) {
  const { tenant: slug } = await params;
  const query = await searchParams;
  const tab = TABS.find((t) => t.key === query.onglet) ?? TABS[0];
  const { session, tenant, ctx } = await requirePermission(slug, 'environment', 'read');
  const canEdit = can(session, tenant.id, 'environment', 'edit');
  const env = getRepos().environment;
  const zones = await env.zones.list(ctx);

  let content: ReactNode = null;
  if (tab.key === 'zones') {
    content = <ZonesManager slug={slug} center={tenant.center} canEdit={canEdit} zones={zones.map((z) => ({ id: z.id, name: z.name, geom: z.geom }))} />;
  } else if (tab.key === 'calendrier') {
    const now = getRequestTime();
    const [schedules, previews] = await Promise.all([
      env.schedules.list(ctx),
      Promise.all(zones.map(async (z) => ({ zoneId: z.id, next: await env.nextCollections(ctx, z.id, now, 8) }))),
    ]);
    content = (
      <SchedulesManager
        slug={slug}
        canEdit={canEdit}
        zones={zones.map((z) => ({ id: z.id, name: z.name }))}
        schedules={schedules.map(({ id, zoneId, wasteType, rrule, exceptions, note }) => ({ id, zoneId, wasteType, rrule, exceptions, note }))}
        previews={previews.map((p) => ({
          zoneId: p.zoneId,
          next: p.next.map((o) => ({
            key: `${o.scheduleId}-${o.date}`,
            label: `${formatDateFr(new Date(`${o.date}T12:00:00Z`), 'EEEE d MMMM')} : ${WASTE_TYPE_LABELS[o.wasteType]}${
              o.movedFrom ? ` (reportée du ${formatDateFr(new Date(`${o.movedFrom}T12:00:00Z`), 'd MMMM')})` : ''
            }`,
          })),
        }))}
      />
    );
  } else if (tab.key === 'tri') {
    const items = await env.sortingGuide.list(ctx);
    content = <SortingGuideManager slug={slug} canEdit={canEdit} items={items.map(({ id, name, bin, advice }) => ({ id, name, bin, advice }))} />;
  } else {
    const repos = getRepos();
    const categories = can(session, tenant.id, 'map', 'read') ? await repos.placeCategories.list(ctx) : [];
    const category = categories.find((c) => c.key === 'decheterie');
    const places = category ? (await repos.places.list(ctx, { filters: { categoryId: [category.id] }, pageSize: 100 })).items : [];
    content = (
      <section aria-labelledby="decheteries-titre" className="space-y-4">
        <h2 id="decheteries-titre" className="text-lg font-semibold">
          Déchèteries et points d’apport
        </h2>
        {places.length === 0 ? <p className="text-muted-foreground text-sm">Aucune déchèterie dans la carte (catégorie « Déchèterie »).</p> : null}
        <ul className="grid gap-4 md:grid-cols-2">
          {places.map((p) => (
            <li key={p.id} className="rounded-lg border p-4">
              <h3 className="font-medium">
                <Link href={`/${slug}/carte/${p.id}`} className="underline-offset-4 hover:underline">
                  {p.name}
                </Link>
              </h3>
              <p className="text-muted-foreground text-sm">{p.address}</p>
              <ul className="mt-2 text-sm">
                {describeOpeningHoursFr(p.openingHours).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <>
      <PageHeader title="Environnement" description="Collecte des déchets, consignes de tri et déchèteries." />
      <nav aria-label="Sections de l’environnement" className="mb-6 border-b">
        <ul className="-mb-px flex flex-wrap gap-4">
          {TABS.map((t) => (
            <li key={t.key}>
              <Link
                href={`/${slug}/environnement${t.key === 'zones' ? '' : `?onglet=${t.key}`}`}
                aria-current={t.key === tab.key ? 'page' : undefined}
                className={cn(
                  'inline-block border-b-2 px-1 py-2 text-sm font-medium',
                  t.key === tab.key ? 'border-primary text-foreground' : 'text-muted-foreground hover:text-foreground border-transparent',
                )}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {content}
    </>
  );
}
