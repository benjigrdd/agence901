import type { Metadata } from 'next';

import { ModulePlaceholder } from '@/components/shell/module-placeholder';
import { requirePermission } from '@/server/guards';

export const metadata: Metadata = { title: "Thématiques" };

export default async function Page({ params }: PageProps<'/[tenant]/parametres/thematiques'>) {
  const { tenant } = await params;
  await requirePermission(tenant, 'settings', 'read');
  return <ModulePlaceholder title="Thématiques" description="Thèmes d’intérêt proposés aux habitants." lot="06" />;
}
