/**
 * @app/data — couche d'acces aux donnees.
 *
 * Seul point d'entree des applications (dashboard et mobile) vers les donnees :
 * l'interface n'appelle jamais Supabase directement.
 * - `ports.ts` : une interface par depot ; chaque methode recoit un `DataContext`.
 * - adaptateur `mock` : en memoire, applique isolation, permissions et workflows.
 * - adaptateur `supabase` : memes interfaces (lot 14), RLS appliquee avec la session de l'appelant.
 */
import type { MockOptions } from './mock';
import { createMockRepositories } from './mock';
import type { Repositories } from './ports';
import type { ClientResolver } from './supabase';
import { createSupabaseRepositories } from './supabase';

export * from './context';
export * from './errors';
export * from './personas';
export * from './ports';
export * from './tenant-defaults';

export type DataSource = 'mock' | 'supabase';

export type DataSourceConfig = { source: 'mock'; mock?: MockOptions } | { source: 'supabase'; resolve: ClientResolver };

export function createRepositories(config: DataSourceConfig): Repositories {
  if (config.source === 'mock') return createMockRepositories(config.mock);
  return createSupabaseRepositories(config.resolve);
}
