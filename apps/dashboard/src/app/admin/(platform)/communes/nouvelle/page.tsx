import type { Metadata } from 'next';

import { ModulePlaceholder } from '@/components/shell/module-placeholder';
import { requirePlatformAdmin } from '@/server/guards';

export const metadata: Metadata = { title: 'Nouvelle commune' };

export default async function NewTenantPage() {
  await requirePlatformAdmin();
  return <ModulePlaceholder title="Nouvelle commune" description="Assistant de création d’une commune." lot="07" />;
}
