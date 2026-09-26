import type { Metadata } from 'next';

import { ModulePlaceholder } from '@/components/shell/module-placeholder';
import { requirePermission } from '@/server/guards';

export const metadata: Metadata = { title: "Agenda" };

export default async function Page({ params }: PageProps<'/[tenant]/agenda'>) {
  const { tenant } = await params;
  await requirePermission(tenant, 'events', 'read');
  return <ModulePlaceholder title="Agenda" description="Gérez les événements publiés dans l’application." lot="04" />;
}
