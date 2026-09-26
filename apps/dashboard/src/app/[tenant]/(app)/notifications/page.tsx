import type { Metadata } from 'next';

import { ModulePlaceholder } from '@/components/shell/module-placeholder';
import { requirePermission } from '@/server/guards';

export const metadata: Metadata = { title: "Notifications" };

export default async function Page({ params }: PageProps<'/[tenant]/notifications'>) {
  const { tenant } = await params;
  await requirePermission(tenant, 'notifications', 'read');
  return <ModulePlaceholder title="Notifications" description="Envoyez des notifications ciblées aux habitants." lot="06" />;
}
