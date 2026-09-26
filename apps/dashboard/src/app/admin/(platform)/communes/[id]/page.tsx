import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ModulePlaceholder } from '@/components/shell/module-placeholder';
import { requirePlatformAdmin } from '@/server/guards';
import { getRepos } from '@/server/repos';

export const metadata: Metadata = { title: 'Commune' };

export default async function TenantDetailPage({ params }: PageProps<'/admin/communes/[id]'>) {
  const { id } = await params;
  const session = await requirePlatformAdmin();
  const tenant = (await getRepos().tenants.list({ session })).items.find((t) => t.id === id);
  if (!tenant) notFound();
  return <ModulePlaceholder title={tenant.name} description="Marque, modules et informations store de la commune." lot="07" />;
}
