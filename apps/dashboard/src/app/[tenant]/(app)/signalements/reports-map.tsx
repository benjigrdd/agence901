'use client';

import type { GeoPoint, ReportStatus } from '@app/shared';
import { REPORT_STATUS_LABELS } from '@app/shared';
import { useRouter } from 'next/navigation';

import { MapView } from '@/components/map/map-view';

import type { ReportRow } from './reports-table';

/** Couleurs foncees (texte blanc AA) ; le libelle du statut accompagne toujours la couleur. */
export const REPORT_STATUS_COLORS: Record<ReportStatus, string> = {
  new: '#1d4ed8',
  acknowledged: '#475569',
  in_progress: '#b45309',
  resolved: '#15803d',
  rejected: '#b91c1c',
  duplicate: '#52525b',
};

export function ReportsMap({ slug, center, rows }: { slug: string; center: GeoPoint; rows: ReportRow[] }) {
  const router = useRouter();
  return (
    <MapView
      center={center}
      ariaLabel={`Carte des ${rows.length} signalements. La vue Liste présente les mêmes informations.`}
      className="h-[560px] w-full overflow-hidden rounded-md border"
      markers={rows.map((r) => ({
        id: r.id,
        point: r.point,
        color: REPORT_STATUS_COLORS[r.status],
        label: `${r.reference}, ${r.category}, ${REPORT_STATUS_LABELS[r.status]}${r.overdue ? ', en retard' : ''}`,
        content: (
          <>
            {r.overdue ? <span aria-hidden="true">⏰</span> : null}
            {REPORT_STATUS_LABELS[r.status]}
          </>
        ),
        onClick: () => router.push(`/${slug}/signalements/${r.id}`),
      }))}
    />
  );
}
