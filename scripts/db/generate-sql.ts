import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { enumsSql, seedDefaultsSql } from './generated-sql';

export const ENUMS_MIGRATION = 'supabase/migrations/20260926000200_enums.sql';
export const SEED_DEFAULTS_MIGRATION = 'supabase/migrations/20260926001100_seed_tenant_defaults.sql';
/** Copie pour les Edge Functions (Deno) de la correspondance OSM de @app/shared, sans dependance. */
export const OSM_MAPPING_SOURCE = 'packages/shared/src/osm-mapping.ts';
export const OSM_MAPPING_COPY = 'supabase/functions/_shared/osm-mapping.ts';
export const GENERATED_HEADER = `// FICHIER GENERE par \`pnpm db:generate\` depuis ${OSM_MAPPING_SOURCE} : ne pas modifier.\n`;

const root = resolve(import.meta.dirname, '../..');
writeFileSync(resolve(root, ENUMS_MIGRATION), enumsSql());
writeFileSync(resolve(root, SEED_DEFAULTS_MIGRATION), seedDefaultsSql());
writeFileSync(resolve(root, OSM_MAPPING_COPY), GENERATED_HEADER + readFileSync(resolve(root, OSM_MAPPING_SOURCE), 'utf8'));
console.log(`Ecrit : ${ENUMS_MIGRATION}, ${SEED_DEFAULTS_MIGRATION}, ${OSM_MAPPING_COPY}`);
