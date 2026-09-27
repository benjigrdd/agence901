import 'server-only';

import type { Repositories } from '@app/data';
import { createRepositories } from '@app/data';

import { createSupabaseServerClient } from '@/lib/supabase/server';

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
      : // Client de la requete en cours (session dans les cookies) : la RLS s'applique a chaque appel.
        createRepositories({ source: 'supabase', resolve: () => createSupabaseServerClient() });
  return cached;
}
