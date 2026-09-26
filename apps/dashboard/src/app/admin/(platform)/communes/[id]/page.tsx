import { formatDateFr, formatNumberFr, MEMBERSHIP_STATUS_LABELS, ROLE_LABELS, TENANT_STATUS_LABELS } from '@app/shared';
import { ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { requirePlatformTenant } from '@/server/guards';
import { getRepos } from '@/server/repos';
import { getRequestTime } from '@/server/time';

import { MembersManager } from '@/app/[tenant]/(app)/parametres/membres/members-manager';
import { BrandingTab, DangerZone, GeneralTab, ModulesTab, StoresTab } from './tenant-tabs';
import { UsageCharts } from './usage-charts';

export const metadata: Metadata = { title: 'Commune' };

const TABS = [
  { key: 'general', label: 'Général' },
  { key: 'marque', label: 'Marque' },
  { key: 'modules', label: 'Modules' },
  { key: 'membres', label: 'Membres' },
  { key: 'stores', label: 'Stores' },
  { key: 'usage', label: 'Usage' },
  { key: 'zone-sensible', label: 'Zone sensible' },
] as const;

export default async function TenantDetailPage({ params, searchParams }: PageProps<'/admin/communes/[id]'>) {
  const { id } = await params;
  const query = await searchParams;
  const tab = TABS.find((t) => t.key === query.onglet) ?? TABS[0];
  const { session, tenant, ctx } = await requirePlatformTenant(id);
  const repos = getRepos();

  let content: ReactNode = null;
  if (tab.key === 'general') {
    content = <GeneralTab tenant={tenant} />;
  } else if (tab.key === 'marque') {
    const b = await repos.branding.get(ctx);
    content = <BrandingTab tenantId={tenant.id} initial={{ appName: b.appName, shortName: b.shortName, colors: b.colors, logoUrl: b.logoUrl }} iconUrl={b.iconUrl} />;
  } else if (tab.key === 'modules') {
    const modules = await repos.modules.list(ctx);
    content = <ModulesTab tenantId={tenant.id} modules={modules.map((m) => ({ module: m.module, enabled: m.enabled }))} />;
  } else if (tab.key === 'membres') {
    const members = await repos.members.list(ctx, { pageSize: 500 });
    content = (
      <MembersManager
        slug={tenant.slug}
        currentUserId={session.userId}
        members={members.items.map((m) => ({
          id: m.membership.id,
          userId: m.membership.userId,
          name: m.profile.displayName,
          email: m.profile.email,
          role: m.membership.role,
          roleLabel: ROLE_LABELS[m.membership.role],
          status: m.status,
          statusLabel: MEMBERSHIP_STATUS_LABELS[m.status],
          lastSignIn: m.profile.lastSignInAt ? formatDateFr(new Date(m.profile.lastSignInAt), 'd MMM yyyy') : 'Jamais',
          permissions: m.permissions,
        }))}
      />
    );
  } else if (tab.key === 'stores') {
    const info = await repos.storeInfo.get(ctx);
    const { id: _i, tenantId: _t, createdAt: _c, updatedAt: _u, ...input } = info;
    void [_i, _t, _c, _u];
    content = <StoresTab tenantId={tenant.id} initial={input} />;
  } else if (tab.key === 'usage') {
    const now = getRequestTime();
    const days = await repos.usage.daily(ctx, { from: new Date(now.getTime() - 89 * 86_400_000).toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) });
    content = (
      <UsageCharts
        days={days.map((d) => ({ date: d.date, label: formatDateFr(new Date(`${d.date}T12:00:00Z`), 'd MMM'), installs: d.installs, activeUsers: d.activeUsers, reports: d.reportsCreated, posts: d.postsPublished }))}
      />
    );
  } else {
    content = <DangerZone tenantId={tenant.id} slug={tenant.slug} status={tenant.status} />;
  }

  return (
    <>
      <PageHeader
        title={tenant.name}
        description={`${TENANT_STATUS_LABELS[tenant.status]} · INSEE ${tenant.inseeCode} · ${formatNumberFr(tenant.population)} habitants`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/${tenant.slug}`}>
              <ExternalLink aria-hidden="true" />
              Ouvrir l’espace de la commune
            </Link>
          </Button>
        }
      />
      <nav aria-label="Sections de la fiche commune" className="mb-6 border-b">
        <ul className="-mb-px flex flex-wrap gap-4">
          {TABS.map((t) => (
            <li key={t.key}>
              <Link
                href={`/admin/communes/${tenant.id}${t.key === 'general' ? '' : `?onglet=${t.key}`}`}
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
