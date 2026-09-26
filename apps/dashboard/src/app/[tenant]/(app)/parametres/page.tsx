import { isTenantAdmin } from '@app/shared';
import { redirect } from 'next/navigation';

import { requirePermission } from '@/server/guards';

export default async function SettingsIndex({ params }: PageProps<'/[tenant]/parametres'>) {
  const { tenant: slug } = await params;
  const { session, tenant } = await requirePermission(slug, 'settings', 'read');
  redirect(`/${slug}/parametres/${isTenantAdmin(session, tenant.id) ? 'membres' : 'commune'}`);
}
