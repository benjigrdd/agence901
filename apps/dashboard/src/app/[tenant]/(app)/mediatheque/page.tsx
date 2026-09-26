import type { Metadata } from 'next';

import { ModulePlaceholder } from '@/components/shell/module-placeholder';
import { requirePermission } from '@/server/guards';

export const metadata: Metadata = { title: "Médiathèque" };

export default async function Page({ params }: PageProps<'/[tenant]/mediatheque'>) {
  const { tenant } = await params;
  await requirePermission(tenant, 'media', 'read');
  return <ModulePlaceholder title="Médiathèque" description="Images utilisées dans les actualités, l’agenda et la carte." lot="04" />;
}
