import { describe, it } from 'vitest';

import { describeRepositoryContract } from '../contract';
import { createSupabaseRepositories } from './index';
import { localPersonaResolver } from './local-personas';

/**
 * Meme suite de contrat que le mock, sur Supabase local reinitialise :
 *   pnpm db:reset && pnpm db:seed && SUPABASE_CONTRACT=1 pnpm --filter @app/data test
 */
if (process.env.SUPABASE_CONTRACT === '1') {
  describeRepositoryContract('supabase', () => createSupabaseRepositories(localPersonaResolver()));
} else {
  describe('contrat des dépôts — supabase', () => {
    it.skip('nécessite Supabase local (SUPABASE_CONTRACT=1)', () => {});
  });
}
