import type { PostFilters } from '@app/data';
import type { ContentStatus, PostType } from '@app/shared';
import { can, formatDateFr, formatDateTimeLongFr, POST_TYPE_LABELS, POST_TYPES } from '@app/shared';
import { Plus, Siren } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHeader } from '@/components/page-header';
import { TruncationNotice } from '@/components/truncation-notice';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { authorNames } from '@/server/content';
import { requirePermission } from '@/server/guards';
import { getRequestTime } from '@/server/time';
import { getRepos } from '@/server/repos';

import { PostsTable } from './posts-table';

export const metadata: Metadata = { title: 'Actualités' };

const TABS: { key: string; label: string; status: ContentStatus | null }[] = [
  { key: 'tous', label: 'Tous', status: null },
  { key: 'brouillons', label: 'Brouillons', status: 'draft' },
  { key: 'a-valider', label: 'À valider', status: 'pending_review' },
  { key: 'programmees', label: 'Programmées', status: 'scheduled' },
  { key: 'publiees', label: 'Publiées', status: 'published' },
  { key: 'archivees', label: 'Archivées', status: 'archived' },
];

const isPostType = (v: string | undefined): v is PostType => (POST_TYPES as readonly string[]).includes(v ?? '');

export default async function NewsPage({ params, searchParams }: PageProps<'/[tenant]/actualites'>) {
  const { tenant: slug } = await params;
  const query = await searchParams;
  const tabKey = typeof query.onglet === 'string' ? query.onglet : 'tous';
  const typeFilter = typeof query.type === 'string' && isPostType(query.type) ? query.type : undefined;
  const districtFilter = typeof query.quartier === 'string' && query.quartier ? query.quartier : undefined;
  const tab = TABS.find((t) => t.key === tabKey) ?? TABS[0];

  const { session, tenant, ctx } = await requirePermission(slug, 'news', 'read');
  const repos = getRepos();
  const filters: PostFilters = {
    ...(tab?.status ? { status: [tab.status] } : {}),
    ...(typeFilter ? { type: [typeFilter] } : {}),
    ...(districtFilter ? { districtId: districtFilter } : {}),
  };
  const [list, counts, districts, names, allPublished] = await Promise.all([
    repos.posts.list(ctx, { filters, pageSize: 500 }),
    repos.posts.counts(ctx),
    repos.districts.list(ctx),
    authorNames(ctx),
    repos.posts.list(ctx, { filters: { status: ['published'], type: ['alert'] }, pageSize: 50 }),
  ]);

  const now = getRequestTime().getTime();
  const activeAlert = allPublished.items.find((p) => !p.unpublishAt || Date.parse(p.unpublishAt) > now);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const rows = list.items
    .sort((a, b) => Number(b.id === activeAlert?.id) - Number(a.id === activeAlert?.id) || Number(b.pinned) - Number(a.pinned))
    .map((p) => ({
      id: p.id,
      title: p.title,
      typeLabel: POST_TYPE_LABELS[p.type],
      status: p.status,
      publication:
        p.status === 'scheduled' && p.publishAt
          ? `Programmée le ${formatDateTimeLongFr(new Date(p.publishAt))}`
          : p.publishAt && (p.status === 'published' || p.status === 'archived')
            ? formatDateFr(new Date(p.publishAt), 'd MMM yyyy')
            : '—',
      author: names.get(p.authorId) ?? 'Membre du personnel',
      updatedAt: p.updatedAt,
      updatedLabel: formatDateFr(new Date(p.updatedAt)),
      pinned: p.pinned || p.id === activeAlert?.id,
    }));

  const hrefFor = (key: string) => {
    const sp = new URLSearchParams();
    if (key !== 'tous') sp.set('onglet', key);
    if (typeFilter) sp.set('type', typeFilter);
    if (districtFilter) sp.set('quartier', districtFilter);
    const qs = sp.toString();
    return `/${slug}/actualites${qs ? `?${qs}` : ''}`;
  };

  return (
    <>
      <PageHeader
        title="Actualités"
        description="Rédigez, faites valider et programmez les actualités de la commune."
        actions={
          can(session, tenant.id, 'news', 'edit') ? (
            <Button asChild>
              <Link href={`/${slug}/actualites/nouveau`}>
                <Plus aria-hidden="true" />
                Nouvelle actualité
              </Link>
            </Button>
          ) : null
        }
      />

      {activeAlert ? (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-md border border-red-300 bg-red-50 p-4 text-red-900">
          <Siren className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>
            <span className="font-semibold">Alerte en cours : </span>
            <Link href={`/${slug}/actualites/${activeAlert.id}`} className="underline">
              {activeAlert.title}
            </Link>
          </p>
        </div>
      ) : null}

      <nav aria-label="Filtrer par statut" className="mb-4 border-b">
        <ul className="-mb-px flex flex-wrap gap-4">
          {TABS.map((t) => {
            const count = t.status ? counts[t.status] : total;
            const active = t.key === tab?.key;
            return (
              <li key={t.key}>
                <Link
                  href={hrefFor(t.key)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex items-center gap-1.5 border-b-2 px-1 py-2 text-sm font-medium',
                    active ? 'border-primary text-foreground' : 'text-muted-foreground hover:text-foreground border-transparent',
                  )}
                >
                  {t.label}
                  <span className={cn('rounded-full px-1.5 text-xs', t.status === 'pending_review' && count > 0 ? 'bg-amber-100 text-amber-900' : 'bg-muted')}>
                    {count}
                    <span className="sr-only"> élément{count > 1 ? 's' : ''}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        {tab?.key !== 'tous' ? <input type="hidden" name="onglet" value={tab?.key} /> : null}
        <div className="space-y-1">
          <Label htmlFor="filtre-type">Type</Label>
          <select id="filtre-type" name="type" defaultValue={typeFilter ?? ''} className="border-input bg-background h-9 rounded-md border px-3 text-sm">
            <option value="">Tous les types</option>
            {POST_TYPES.map((t) => (
              <option key={t} value={t}>
                {POST_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="filtre-quartier">Quartier</Label>
          <select id="filtre-quartier" name="quartier" defaultValue={districtFilter ?? ''} className="border-input bg-background h-9 rounded-md border px-3 text-sm">
            <option value="">Tous les quartiers</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrer
        </Button>
      </form>

      <TruncationNotice shown={list.items.length} total={list.total} hint="Affinez les filtres pour retrouver un contenu plus ancien." />
      <PostsTable slug={slug} rows={rows} />
    </>
  );
}
