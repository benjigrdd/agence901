import type { Metadata } from 'next';

import type { SidebarSection } from '@/components/shell/app-sidebar';
import { AppSidebar } from '@/components/shell/app-sidebar';
import { Topbar } from '@/components/shell/topbar';
import { SkipLink } from '@/components/skip-link';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { BREADCRUMB_LABELS } from '@/lib/breadcrumb-labels';
import { buildNavigation } from '@/lib/navigation';
import { getProductName } from '@/lib/product-name';
import { requireTenant } from '@/server/guards';
import { getRepos } from '@/server/repos';
import { describeUser } from '@/server/session';

export async function generateMetadata({ params }: LayoutProps<'/[tenant]'>): Promise<Metadata> {
  const { tenant: slug } = await params;
  const { tenant } = await requireTenant(slug);
  const product = getProductName();
  return {
    title: { template: `%s · ${tenant.name} · ${product}`, default: `Accueil · ${tenant.name} · ${product}` },
  };
}

export default async function TenantLayout({ children, params }: LayoutProps<'/[tenant]'>) {
  const { tenant: slug } = await params;
  const { session, tenant, ctx } = await requireTenant(slug);
  const repos = getRepos();
  const [modules, branding, tenants] = await Promise.all([
    repos.modules.list(ctx),
    repos.branding.get(ctx),
    repos.tenants.list({ session }),
  ]);

  const basePath = `/${tenant.slug}`;
  const enabled = modules.filter((m) => m.enabled).map((m) => m.module);
  const sections: SidebarSection[] = buildNavigation(session, tenant.id, enabled).map((group) => ({
    key: group.key,
    label: group.label,
    items: group.items.map((item) => ({
      key: item.key,
      label: item.label,
      icon: item.icon,
      href: item.soon ? null : item.segment ? `${basePath}/${item.segment}` : basePath,
      matchPrefix: item.segment !== '',
    })),
  }));
  const isEditorView = session.isPlatformAdmin && !session.memberships.some((m) => m.tenantId === tenant.id);
  // Chaque acces de l'editeur a l'espace d'une commune est inscrit dans l'audit de cette commune.
  if (isEditorView) await repos.audit.recordPlatformAccess(ctx);

  return (
    <SidebarProvider>
      <SkipLink />
      <AppSidebar
        sections={sections}
        title={tenant.name}
        subtitle="Espace de gestion"
        logoUrl={branding.logoUrl}
        navLabel="Navigation principale"
      />
      <SidebarInset>
        <Topbar
          basePath={basePath}
          rootLabel={tenant.name}
          breadcrumbLabels={BREADCRUMB_LABELS}
          tenants={tenants.items.map((t) => ({ slug: t.slug, name: t.name }))}
          currentSlug={tenant.slug}
          user={describeUser(session, tenant.id)}
        />
        {isEditorView ? (
          <p role="status" className="border-b border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-900">
            Vous consultez l’espace de {tenant.name} en tant qu’éditeur.
          </p>
        ) : null}
        <main id="contenu" tabIndex={-1} className="flex-1 p-4 focus:outline-none sm:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
