import { can, PLACE_SOURCE_LABELS, WHEELCHAIR_ACCESS_LABELS } from '@app/shared';
import { Plus, Tags } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { ViewSwitch } from '@/components/map/view-switch';
import { PageHeader } from '@/components/page-header';
import { TruncationNotice } from '@/components/truncation-notice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requirePermission } from '@/server/guards';
import { getRepos } from '@/server/repos';

import { OpenDataActions } from './open-data-actions';
import { PlacesMap } from './places-map';
import type { PlaceRow } from './places-table';
import { PlacesTable } from './places-table';

export const metadata: Metadata = { title: 'Carte' };

export default async function PlacesPage({ params, searchParams }: PageProps<'/[tenant]/carte'>) {
  const { tenant: slug } = await params;
  const query = await searchParams;
  const { session, tenant, ctx } = await requirePermission(slug, 'map', 'read');
  const categoryFilter = typeof query.categorie === 'string' && query.categorie ? query.categorie : '';
  const search = typeof query.q === 'string' ? query.q.slice(0, 100) : '';
  const view = query.vue === 'carte' ? 'carte' : 'liste';
  const repos = getRepos();
  const [list, categories] = await Promise.all([
    repos.places.list(ctx, { pageSize: 1000, ...(search ? { search } : {}), ...(categoryFilter ? { filters: { categoryId: [categoryFilter] } } : {}) }),
    repos.placeCategories.list(ctx),
  ]);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const rows: PlaceRow[] = list.items.map((p) => ({
    id: p.id,
    name: p.name,
    category: byId.get(p.categoryId)?.label ?? '—',
    color: byId.get(p.categoryId)?.color ?? '#1d4ed8',
    address: p.address,
    source: PLACE_SOURCE_LABELS[p.source],
    accessibility: WHEELCHAIR_ACCESS_LABELS[p.accessibility.wheelchair],
    point: p.point,
  }));
  const canEdit = can(session, tenant.id, 'map', 'edit');
  const base = `/${slug}/carte`;
  const qs = (extra: Record<string, string>) => {
    const sp = new URLSearchParams({ ...(categoryFilter ? { categorie: categoryFilter } : {}), ...(search ? { q: search } : {}), ...extra });
    const s = sp.toString();
    return s ? `?${s}` : '';
  };

  return (
    <>
      <PageHeader
        title="Carte"
        description="Gérez les lieux et équipements affichés dans l’application."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`${base}/categories`}>
                <Tags aria-hidden="true" />
                Catégories
              </Link>
            </Button>
            {canEdit ? (
              <OpenDataActions
                slug={slug}
                categories={categories.map((c) => ({ id: c.id, key: c.key, label: c.label }))}
              />
            ) : null}
            {canEdit ? (
              <Button asChild>
                <Link href={`${base}/nouveau`}>
                  <Plus aria-hidden="true" />
                  Nouveau lieu
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />
      <form method="get" className="mb-4 flex flex-wrap items-end gap-3" aria-label="Filtrer les lieux">
        <TruncationNotice shown={list.items.length} total={list.total} hint="Filtrez par catégorie ou recherchez un lieu." />
      {view === 'carte' ? <input type="hidden" name="vue" value="carte" /> : null}
        <div className="space-y-1">
          <Label htmlFor="f-cat">Catégorie</Label>
          <select id="f-cat" name="categorie" defaultValue={categoryFilter} className="border-input bg-background h-9 rounded-md border px-3 text-sm">
            <option value="">Toutes</option>
            {categories
              .filter((c) => !c.hidden)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-q">Recherche</Label>
          <Input id="f-q" name="q" defaultValue={search} placeholder="Nom ou adresse" className="w-56" />
        </div>
        <Button type="submit" variant="outline">
          Filtrer
        </Button>
      </form>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm" role="status">
          {list.total} lieu{list.total > 1 ? 'x' : ''}
        </p>
        <ViewSwitch label="Affichage des lieux" current={view} listHref={`${base}${qs({})}`} mapHref={`${base}${qs({ vue: 'carte' })}`} />
      </div>
      {view === 'carte' ? <PlacesMap slug={slug} center={tenant.center} rows={rows} /> : <PlacesTable slug={slug} rows={rows} />}
    </>
  );
}
