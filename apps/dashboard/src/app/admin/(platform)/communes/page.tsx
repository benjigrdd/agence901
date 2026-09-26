import { TENANT_STATUS_LABELS } from '@app/shared';
import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { requirePlatformAdmin } from '@/server/guards';
import { getRepos } from '@/server/repos';

import { TenantsTable } from './tenants-table';

export const metadata: Metadata = { title: 'Communes' };

export default async function TenantsPage() {
  const session = await requirePlatformAdmin();
  const { items } = await getRepos().tenants.list({ session });
  const rows = items.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    inseeCode: t.inseeCode,
    population: t.population,
    status: TENANT_STATUS_LABELS[t.status],
  }));
  return (
    <>
      <PageHeader
        title="Communes"
        description="Communes clientes de la plateforme."
        actions={
          <Button asChild>
            <Link href="/admin/communes/nouvelle">
              <Plus aria-hidden="true" />
              Nouvelle commune
            </Link>
          </Button>
        }
      />
      <TenantsTable rows={rows} />
    </>
  );
}
