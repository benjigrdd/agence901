import 'server-only';

import type { Session } from '@app/shared';

import { getRepos } from './repos';

const DAY = 86_400_000;

export type TenantUsageRow = {
  id: string;
  name: string;
  slug: string;
  installs: number;
  activeUsers: number;
  reportsCreated: number;
  reportsResolved: number;
  averageResolutionDays: number | null;
  postsPublished: number;
  notificationsSent: number;
  lowActivity: boolean;
};

/** Indicateurs multi-communes sur `days` jours (super-admin). Aucune donnee personnelle. */
export async function platformUsage(session: Session, days: number, now: Date): Promise<TenantUsageRow[]> {
  const repos = getRepos();
  const from = new Date(now.getTime() - days * DAY).toISOString();
  const to = now.toISOString();
  const since14 = new Date(now.getTime() - 14 * DAY).toISOString();
  const inRange = (iso: string | null) => iso !== null && iso >= from && iso <= to;
  const { items } = await repos.tenants.list({ session });
  return Promise.all(
    items.map(async (t) => {
      const ctx = { session, tenantId: t.id };
      const [usage, usage30, reports, stats, posts, notifications] = await Promise.all([
        repos.usage.daily(ctx, { from: from.slice(0, 10), to: to.slice(0, 10) }),
        repos.usage.daily(ctx, { from: new Date(now.getTime() - 30 * DAY).toISOString().slice(0, 10), to: to.slice(0, 10) }),
        repos.reports.list(ctx, { pageSize: 1000 }),
        repos.reports.stats(ctx),
        repos.posts.list(ctx, { filters: { status: ['published'] }, pageSize: 1000 }),
        repos.notifications.list(ctx, { pageSize: 1000 }),
      ]);
      const published = posts.items.map((p) => p.publishAt ?? p.updatedAt);
      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        installs: usage.reduce((s, d) => s + d.installs, 0),
        activeUsers: usage30.length ? Math.round(usage30.reduce((s, d) => s + d.activeUsers, 0) / usage30.length) : 0,
        reportsCreated: reports.items.filter((r) => inRange(r.report.createdAt)).length,
        reportsResolved: reports.items.filter((r) => inRange(r.report.resolvedAt)).length,
        averageResolutionDays: stats.averageResolutionDays,
        postsPublished: published.filter((d) => inRange(d)).length,
        notificationsSent: notifications.items.filter((n) => inRange(n.sentAt)).length,
        lowActivity: !published.some((d) => d >= since14 && d <= to),
      };
    }),
  );
}

export const USAGE_PERIODS = [30, 90, 365] as const;
export function parseUsagePeriod(value: unknown): number {
  const n = Number(value);
  return USAGE_PERIODS.find((p) => p === n) ?? 30;
}
