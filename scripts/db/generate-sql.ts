import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { enumsSql, seedDefaultsSql } from './generated-sql';

export const ENUMS_MIGRATION = 'supabase/migrations/20260926000200_enums.sql';
export const SEED_DEFAULTS_MIGRATION = 'supabase/migrations/20260926001100_seed_tenant_defaults.sql';

const root = resolve(import.meta.dirname, '../..');
writeFileSync(resolve(root, ENUMS_MIGRATION), enumsSql());
writeFileSync(resolve(root, SEED_DEFAULTS_MIGRATION), seedDefaultsSql());
console.log(`Ecrit : ${ENUMS_MIGRATION}, ${SEED_DEFAULTS_MIGRATION}`);
