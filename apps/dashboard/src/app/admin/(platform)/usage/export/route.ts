import { isPlatformAdmin } from '@app/shared';

import { parseUsagePeriod, platformUsage } from '@/server/platform-usage';
import { getSession } from '@/server/session';

const HEADERS = ['Commune', 'Installations', 'Actifs (moyenne 30 j)', 'Signalements créés', 'Signalements résolus', 'Délai moyen (jours)', 'Contenus publiés', 'Notifications envoyées', 'Commune peu active'];

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.aal !== 'aal2' || !isPlatformAdmin(session)) return new Response('Introuvable', { status: 404 });
  const days = parseUsagePeriod(new URL(request.url).searchParams.get('periode'));
  const rows = await platformUsage(session, days, new Date());
  const cell = (v: string) => (/[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = rows.map((r) =>
    [r.name, r.installs, r.activeUsers, r.reportsCreated, r.reportsResolved, r.averageResolutionDays ?? '', r.postsPublished, r.notificationsSent, r.lowActivity ? 'oui' : 'non']
      .map((v) => cell(String(v)))
      .join(';'),
  );
  return new Response(`\uFEFF${[HEADERS.join(';'), ...lines].join('\r\n')}\r\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="usage-${days}j-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
