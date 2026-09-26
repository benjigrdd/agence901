/**
 * @app/data — couche d'acces aux donnees.
 *
 * Seul point d'entree des applications (dashboard et mobile) vers les donnees :
 * l'interface n'appelle jamais Supabase directement.
 * - `ports.ts` : une interface par depot ; chaque methode recoit un `DataContext`.
 * - adaptateur `mock` : en memoire, applique isolation, permissions et workflows.
 * - adaptateur `supabase` : memes interfaces, branche au lot 14.
 */
import { NotImplementedError } from './errors';
import type { MockOptions } from './mock';
import { createMockRepositories } from './mock';
import type { Repositories } from './ports';

export * from './context';
export * from './errors';
export * from './personas';
export * from './ports';

export type DataSource = 'mock' | 'supabase';

export type DataSourceConfig = { source: 'mock'; mock?: MockOptions } | { source: 'supabase'; client: unknown };

export function createRepositories(config: DataSourceConfig): Repositories {
  if (config.source === 'mock') return createMockRepositories(config.mock);
  throw new NotImplementedError('Adaptateur Supabase : lot 14');
}
