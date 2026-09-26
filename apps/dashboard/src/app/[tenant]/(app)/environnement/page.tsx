import type { Metadata } from 'next';

import { ModulePlaceholder } from '@/components/shell/module-placeholder';
import { requirePermission } from '@/server/guards';

export const metadata: Metadata = { title: "Environnement" };

export default async function Page({ params }: PageProps<'/[tenant]/environnement'>) {
  const { tenant } = await params;
  await requirePermission(tenant, 'environment', 'read');
  return <ModulePlaceholder title="Environnement" description="Zones et calendriers de collecte, consignes de tri." lot="06" />;
}
