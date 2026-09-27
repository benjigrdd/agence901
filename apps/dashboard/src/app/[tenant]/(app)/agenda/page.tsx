import type { EventFilters } from '@app/data';
import type { ContentStatus, EventCategory } from '@app/shared';
import {
  can,
  CONTENT_STATUS_LABELS,
  CONTENT_STATUSES,
  EVENT_CATEGORIES,
  EVENT_CATEGORY_LABELS,
  expandOccurrences,
  formatDateFr,
  PARIS_TIME_ZONE,
  parisInputToIso,
} from '@app/shared';
import { formatInTimeZone } from 'date-fns-tz';
import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';

import { CsvImportDialog } from '@/components/csv-import/csv-import-dialog';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { requirePermission } from '@/server/guards';
import { getRepos } from '@/server/repos';
import { getRequestTime } from '@/server/time';

import { EventsTable } from './events-table';
import type { CalendarOccurrence } from './month-calendar';
import { MonthCalendar } from './month-calendar';
import { AGENDA_VIEW_COOKIE, ViewToggle } from './view-toggle';

export const metadata: Metadata = { title: 'Agenda' };

const isCategory = (v: string): v is EventCategory => (EVENT_CATEGORIES as readonly string[]).includes(v);
const isStatus = (v: string): v is ContentStatus => (CONTENT_STATUSES as readonly string[]).includes(v);
const param = (v: string | string[] | undefined) => (typeof v === 'string' && v ? v : undefined);

function shiftMonth(month: string, delta: number): string {
  const [y = 2026, m = 1] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export default async function AgendaPage({ params, searchParams }: PageProps<'/[tenant]/agenda'>) {
  const { tenant: slug } = await params;
  const query = await searchParams;
  const saved = (await cookies()).get(AGENDA_VIEW_COOKIE)?.value;
  const view = (param(query.vue) ?? saved) === 'calendrier' ? 'calendrier' : 'liste';
  const category = param(query.categorie);
  const status = param(query.statut);
  const from = param(query.du);
  const to = param(query.au);
  const now = getRequestTime();
  const month = param(query.mois)?.match(/^\d{4}-\d{2}$/) ? (param(query.mois) ?? '') : formatInTimeZone(now, PARIS_TIME_ZONE, 'yyyy-MM');

  const { session, tenant, ctx } = await requirePermission(slug, 'events', 'read');
  const repos = getRepos();
  const filters: EventFilters = {
    ...(category && isCategory(category) ? { category: [category] } : {}),
    ...(status && isStatus(status) ? { status: [status] } : {}),
    ...(from ? { from: parisInputToIso(`${from}T00:00`) ?? undefined } : {}),
    ...(to ? { to: parisInputToIso(`${to}T23:59`) ?? undefined } : {}),
  };
  const [{ items }, feed] = await Promise.all([repos.events.list(ctx, { filters, pageSize: 500, sort: { field: 'startsAt', direction: 'asc' } }), repos.citizen.publicFeed(ctx)]);
  const placeNames = new Map(feed.places.map((p) => [p.id, p.name]));

  const base = `/${slug}/agenda`;
  const withParams = (overrides: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { categorie: category, statut: status, du: from, au: to, vue: view, mois: view === 'calendrier' ? month : undefined, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    const qs = sp.toString();
    return `${base}${qs ? `?${qs}` : ''}`;
  };

  const rows = items.map((e) => ({
    id: e.id,
    title: e.title,
    category: EVENT_CATEGORY_LABELS[e.category],
    status: e.status,
    startsAt: e.startsAt,
    when: e.allDay ? formatDateFr(new Date(e.startsAt), 'EEEE d MMMM yyyy') : formatDateFr(new Date(e.startsAt), "EEEE d MMMM yyyy 'à' H 'h' mm"),
    recurring: e.rrule !== null,
    place: e.placeId ? (placeNames.get(e.placeId) ?? 'Lieu de la carte') : (e.location?.label ?? '—'),
  }));

  let occurrences: CalendarOccurrence[] = [];
  if (view === 'calendrier') {
    const rangeStart = new Date(parisInputToIso(`${month}-01T00:00`) ?? now);
    const rangeEnd = new Date(parisInputToIso(`${shiftMonth(month, 1)}-01T00:00`) ?? now);
    occurrences = items.flatMap((e) =>
      expandOccurrences(e, rangeStart, new Date(rangeEnd.getTime() - 1)).map((o, i) => ({
        key: `${e.id}-${i}`,
        eventId: e.id,
        title: e.title,
        day: formatInTimeZone(o.start, PARIS_TIME_ZONE, 'yyyy-MM-dd'),
        time: e.allDay ? null : formatInTimeZone(o.start, PARIS_TIME_ZONE, "H 'h' mm"),
        status: e.status,
      })),
    );
  }
  const monthLabel = formatDateFr(new Date(`${month}-15T12:00:00Z`), 'MMMM yyyy');

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Événements publiés dans l’application."
        actions={
          <>
            <ViewToggle current={view} listHref={withParams({ vue: 'liste', mois: undefined })} calendarHref={withParams({ vue: 'calendrier', mois: month })} />
            {can(session, tenant.id, 'events', 'edit') ? (
              <>
                <CsvImportDialog slug={slug} entity="events" />
                <Button asChild>
                  <Link href={`${base}/nouveau`}>
                    <Plus aria-hidden="true" />
                    Nouvel événement
                  </Link>
                </Button>
              </>
            ) : null}
          </>
        }
      />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="vue" value={view} />
        {view === 'calendrier' ? <input type="hidden" name="mois" value={month} /> : null}
        <div className="space-y-1">
          <Label htmlFor="filtre-categorie">Catégorie</Label>
          <select id="filtre-categorie" name="categorie" defaultValue={category ?? ''} className="border-input bg-background h-9 rounded-md border px-3 text-sm">
            <option value="">Toutes</option>
            {EVENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {EVENT_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="filtre-statut">Statut</Label>
          <select id="filtre-statut" name="statut" defaultValue={status ?? ''} className="border-input bg-background h-9 rounded-md border px-3 text-sm">
            <option value="">Tous</option>
            {CONTENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CONTENT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        {view === 'liste' ? (
          <>
            <div className="space-y-1">
              <Label htmlFor="filtre-du">Du</Label>
              <input id="filtre-du" type="date" name="du" defaultValue={from} className="border-input bg-background h-9 rounded-md border px-3 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="filtre-au">Au</Label>
              <input id="filtre-au" type="date" name="au" defaultValue={to} className="border-input bg-background h-9 rounded-md border px-3 text-sm" />
            </div>
          </>
        ) : null}
        <Button type="submit" variant="outline">
          Filtrer
        </Button>
      </form>

      {view === 'calendrier' ? (
        <MonthCalendar
          slug={slug}
          month={month}
          monthLabel={monthLabel}
          prevHref={withParams({ mois: shiftMonth(month, -1) })}
          nextHref={withParams({ mois: shiftMonth(month, 1) })}
          today={formatInTimeZone(now, PARIS_TIME_ZONE, 'yyyy-MM-dd')}
          occurrences={occurrences}
        />
      ) : (
        <EventsTable slug={slug} rows={rows} />
      )}
    </>
  );
}
