import type { Metadata } from 'next';

import { ModulePlaceholder } from '@/components/shell/module-placeholder';
import { requirePermission } from '@/server/guards';

export const metadata: Metadata = { title: "Démarches" };

export default async function Page({ params }: PageProps<'/[tenant]/demarches'>) {
  const { tenant } = await params;
  await requirePermission(tenant, 'procedures', 'read');
  return <ModulePlaceholder title="Démarches" description="Démarches administratives proposées dans l’application." lot="06" />;
}
