import type { Metadata } from 'next';

import { ModulePlaceholder } from '@/components/shell/module-placeholder';
import { requirePermission } from '@/server/guards';

export const metadata: Metadata = { title: "Journal d'audit" };

export default async function Page({ params }: PageProps<'/[tenant]/audit'>) {
  const { tenant } = await params;
  await requirePermission(tenant, 'audit', 'read');
  return <ModulePlaceholder title="Journal d'audit" description="Historique des modifications faites par le personnel." lot="06" />;
}
