import { isTenantAdmin } from '@app/shared';

import { SettingsTabs } from '@/components/shell/settings-tabs';
import { requirePermission } from '@/server/guards';

export default async function SettingsLayout({ children, params }: LayoutProps<'/[tenant]/parametres'>) {
  const { tenant: slug } = await params;
  const { session, tenant } = await requirePermission(slug, 'settings', 'read');
  const base = `/${slug}/parametres`;
  const tabs = [
    ...(isTenantAdmin(session, tenant.id) ? [{ href: `${base}/membres`, label: 'Membres' }] : []),
    { href: `${base}/services`, label: 'Services' },
    { href: `${base}/thematiques`, label: 'Thématiques' },
    { href: `${base}/commune`, label: 'Commune' },
  ];
  return (
    <>
      <SettingsTabs tabs={tabs} />
      {children}
    </>
  );
}
