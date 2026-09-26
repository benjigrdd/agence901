import type { Metadata } from 'next';

import { ModulePlaceholder } from '@/components/shell/module-placeholder';
import { requireTenantAdmin } from '@/server/guards';

export const metadata: Metadata = { title: "Membres" };

export default async function Page({ params }: PageProps<'/[tenant]/parametres/membres'>) {
  const { tenant } = await params;
  await requireTenantAdmin(tenant);
  return <ModulePlaceholder title="Membres" description="Membres du personnel et droits par module." lot="06" />;
}
