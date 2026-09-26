import type { Metadata } from 'next';

import { ModulePlaceholder } from '@/components/shell/module-placeholder';
import { requirePermission } from '@/server/guards';

export const metadata: Metadata = { title: "Carte" };

export default async function Page({ params }: PageProps<'/[tenant]/carte'>) {
  const { tenant } = await params;
  await requirePermission(tenant, 'map', 'read');
  return <ModulePlaceholder title="Carte" description="Lieux et équipements affichés sur la carte de l’application." lot="05" />;
}
