import type { Metadata } from 'next';

import type { SidebarSection } from '@/components/shell/app-sidebar';
import { AppSidebar } from '@/components/shell/app-sidebar';
import { Topbar } from '@/components/shell/topbar';
import { SkipLink } from '@/components/skip-link';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { BREADCRUMB_LABELS } from '@/lib/breadcrumb-labels';
import { getProductName } from '@/lib/product-name';
import { requirePlatformAdmin } from '@/server/guards';
import { describeUser } from '@/server/session';

const product = getProductName();

export const metadata: Metadata = {
  title: { template: `%s · Espace éditeur · ${product}`, default: `Espace éditeur · ${product}` },
};

const SECTIONS: SidebarSection[] = [
  {
    key: 'plateforme',
    label: 'Plateforme',
    items: [
      { key: 'tenants', label: 'Communes', href: '/admin/communes', icon: 'tenants', matchPrefix: true },
      { key: 'usage', label: 'Usage', href: '/admin/usage', icon: 'usage', matchPrefix: true },
    ],
  },
];

export default async function PlatformLayout({ children }: LayoutProps<'/admin'>) {
  const session = await requirePlatformAdmin();
  return (
    <SidebarProvider>
      <SkipLink />
      <AppSidebar sections={SECTIONS} title={product} subtitle="Espace éditeur" navLabel="Navigation de l’espace éditeur" />
      <SidebarInset>
        <Topbar basePath="/admin" rootLabel="Espace éditeur" breadcrumbLabels={BREADCRUMB_LABELS} user={await describeUser(session, null)} />
        <main id="contenu" tabIndex={-1} className="flex-1 p-4 focus:outline-none sm:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
