import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import { Breadcrumbs } from './breadcrumbs';
import { TenantSwitcher } from './tenant-switcher';
import { UserMenu } from './user-menu';

type TopbarProps = {
  basePath: string;
  rootLabel: string;
  breadcrumbLabels: Record<string, string>;
  tenants?: { slug: string; name: string }[];
  currentSlug?: string;
  user: { displayName: string; roleLabel: string };
};

export function Topbar({ basePath, rootLabel, breadcrumbLabels, tenants, currentSlug, user }: TopbarProps) {
  return (
    <header className="bg-background sticky top-0 z-10 flex min-h-14 flex-wrap items-center gap-3 border-b px-4 py-2">
      <SidebarTrigger aria-label="Afficher ou masquer le menu" />
      <Separator orientation="vertical" className="h-5" />
      <div className="min-w-0 flex-1">
        <Breadcrumbs basePath={basePath} rootLabel={rootLabel} labels={breadcrumbLabels} />
      </div>
      {tenants && tenants.length > 1 && currentSlug ? <TenantSwitcher tenants={tenants} current={currentSlug} /> : null}
      <UserMenu displayName={user.displayName} roleLabel={user.roleLabel} />
    </header>
  );
}
