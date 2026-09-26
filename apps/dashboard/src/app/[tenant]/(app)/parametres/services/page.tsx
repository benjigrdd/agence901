import type { Metadata } from 'next';

import { ModulePlaceholder } from '@/components/shell/module-placeholder';
import { requirePermission } from '@/server/guards';

export const metadata: Metadata = { title: "Services" };

export default async function Page({ params }: PageProps<'/[tenant]/parametres/services'>) {
  const { tenant } = await params;
  await requirePermission(tenant, 'settings', 'read');
  return <ModulePlaceholder title="Services" description="Services municipaux et catégories de signalement." lot="06" />;
}
