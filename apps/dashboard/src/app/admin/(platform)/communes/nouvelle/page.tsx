import { TENANT_MODULES, V2_MODULES } from '@app/shared';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/page-header';
import { requirePlatformAdmin } from '@/server/guards';

import { TenantWizard } from './tenant-wizard';

export const metadata: Metadata = { title: 'Nouvelle commune' };

export default async function NewTenantPage() {
  await requirePlatformAdmin();
  return (
    <>
      <PageHeader title="Nouvelle commune" description="Créez l’espace d’une commune en 5 étapes." />
      <TenantWizard modules={TENANT_MODULES.map((m) => ({ key: m, v2: (V2_MODULES as readonly string[]).includes(m) }))} />
    </>
  );
}
