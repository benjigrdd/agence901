import type { Metadata } from 'next';

import { ModulePlaceholder } from '@/components/shell/module-placeholder';
import { requireTenant } from '@/server/guards';

export const metadata: Metadata = { title: 'Accueil' };

export default async function Page({ params }: PageProps<'/[tenant]'>) {
  const { tenant } = await params;
  await requireTenant(tenant);
  return <ModulePlaceholder title="Accueil" description="Indicateurs et tâches à traiter." lot="06" />;
}
