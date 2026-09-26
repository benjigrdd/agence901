import type { Metadata } from 'next';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { requirePlatformAdmin } from '@/server/guards';
import { parseUsagePeriod, platformUsage, USAGE_PERIODS } from '@/server/platform-usage';
import { getRequestTime } from '@/server/time';

import { UsageTable } from './usage-table';

export const metadata: Metadata = { title: 'Usage' };

export default async function UsagePage({ searchParams }: PageProps<'/admin/usage'>) {
  const days = parseUsagePeriod((await searchParams).periode);
  const session = await requirePlatformAdmin();
  const rows = await platformUsage(session, days, getRequestTime());
  return (
    <>
      <PageHeader
        title="Usage"
        description="Activité de chaque commune sur la période."
        actions={
          <Button asChild variant="outline">
            <a href={`/admin/usage/export?periode=${days}`} download>
              Exporter en CSV
            </a>
          </Button>
        }
      />
      <form method="get" className="mb-4 flex items-end gap-3" aria-label="Choisir la période">
        <div className="space-y-1">
          <Label htmlFor="periode">Période</Label>
          <select id="periode" name="periode" defaultValue={String(days)} className="border-input bg-background h-9 rounded-md border px-3 text-sm">
            {USAGE_PERIODS.map((p) => (
              <option key={p} value={p}>
                {p} derniers jours
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Afficher
        </Button>
      </form>
      <UsageTable rows={rows} />
    </>
  );
}
