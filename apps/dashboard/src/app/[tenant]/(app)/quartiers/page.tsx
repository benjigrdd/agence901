import type { Metadata } from 'next';

import { ModulePlaceholder } from '@/components/shell/module-placeholder';
import { requirePermission } from '@/server/guards';

export const metadata: Metadata = { title: "Quartiers" };

export default async function Page({ params }: PageProps<'/[tenant]/quartiers'>) {
  const { tenant } = await params;
  await requirePermission(tenant, 'districts', 'read');
  return <ModulePlaceholder title="Quartiers" description="Découpage de la commune utilisé pour cibler les contenus." lot="05" />;
}
