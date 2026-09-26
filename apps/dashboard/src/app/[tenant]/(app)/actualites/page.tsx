import type { Metadata } from 'next';

import { ModulePlaceholder } from '@/components/shell/module-placeholder';
import { requirePermission } from '@/server/guards';

export const metadata: Metadata = { title: "Actualités" };

export default async function Page({ params }: PageProps<'/[tenant]/actualites'>) {
  const { tenant } = await params;
  await requirePermission(tenant, 'news', 'read');
  return <ModulePlaceholder title="Actualités" description="Rédigez, faites valider et programmez les actualités de la commune." lot="04" />;
}
