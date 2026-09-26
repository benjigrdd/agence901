import type { Metadata } from 'next';

import { ModulePlaceholder } from '@/components/shell/module-placeholder';
import { requirePlatformAdmin } from '@/server/guards';

export const metadata: Metadata = { title: 'Usage' };

export default async function UsagePage() {
  await requirePlatformAdmin();
  return <ModulePlaceholder title="Usage" description="Installations et utilisateurs actifs par commune." lot="07" />;
}
