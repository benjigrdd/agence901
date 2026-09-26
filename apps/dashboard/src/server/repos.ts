import 'server-only';

import type { Repositories } from '@app/data';
import { createRepositories } from '@app/data';

export type DataSourceName = 'mock' | 'supabase';

export function getDataSource(): DataSourceName {
  return process.env.DATA_SOURCE === 'supabase' ? 'supabase' : 'mock';
}

export function isMockDataSource(): boolean {
  return getDataSource() === 'mock';
}

let cached: Repositories | undefined;

/** Seul acces aux donnees du dashboard : l'adaptateur applique isolation et droits. */
export function getRepos(): Repositories {
  cached ??=
    getDataSource() === 'mock'
      ? createRepositories({ source: 'mock', mock: { latencyMs: Number(process.env.MOCK_LATENCY_MS ?? '0') || 0 } })
      : createRepositories({ source: 'supabase', client: null });
  return cached;
}
