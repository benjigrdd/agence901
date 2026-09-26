import type { Metadata } from 'next';

import { ModulePlaceholder } from '@/components/shell/module-placeholder';
import { requirePermission } from '@/server/guards';

export const metadata: Metadata = { title: "Signalements" };

export default async function Page({ params }: PageProps<'/[tenant]/signalements'>) {
  const { tenant } = await params;
  await requirePermission(tenant, 'reports', 'read');
  return <ModulePlaceholder title="Signalements" description="Traitez les signalements envoyés par les habitants." lot="05" />;
}
