import { execFileSync } from 'node:child_process';
import { resolve as resolvePath } from 'node:path';

import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ctxOf } from '../contract';
import { TENANT_IDS } from '../personas';
import type { Database } from './database.types';
import { createSupabaseRepositories } from './index';
import { LOCAL_SUPABASE_URL, localPersonaResolver } from './local-personas';

/**
 * PostgREST tronque sans erreur au-dela de `max_rows` (1 000) : les listes doivent rester completes.
 * Supabase local : SUPABASE_CONTRACT=1.
 */
const run = process.env.SUPABASE_CONTRACT === '1' ? describe : describe.skip;
const EXTRA = 1_050;
// Entite propre au test : le decompte ne depend pas des ecritures des autres suites.
const MARKER = `large-list-${crypto.randomUUID()}`;

run('listes au-dela de max_rows (Supabase)', () => {
  let service: ReturnType<typeof createClient<Database>>;

  beforeAll(async () => {
    const raw = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], { cwd: resolvePath(import.meta.dirname, '../../../..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const status: unknown = JSON.parse(raw.slice(raw.indexOf('{')));
    const serviceKey = status && typeof status === 'object' ? String(Reflect.get(status, 'SERVICE_ROLE_KEY')) : '';
    service = createClient<Database>(LOCAL_SUPABASE_URL, serviceKey, { auth: { persistSession: false } });
    const rows = Array.from({ length: EXTRA }, () => ({ tenant_id: TENANT_IDS.beta, action: 'update' as const, entity: MARKER }));
    expect((await service.from('audit_log').insert(rows)).error).toBeNull();
  });

  afterAll(async () => {
    await service.from('audit_log').delete().eq('entity', MARKER);
  });

  it('le journal d audit renvoie le total exact et la derniere page', async () => {
    const expected = EXTRA;

    const repos = createSupabaseRepositories(localPersonaResolver());
    const ctx = ctxOf('admin-beta', 'beta');
    const filters = { entity: MARKER };
    const first = await repos.audit.list(ctx, { filters, pageSize: 1_000 });
    expect(first.total).toBe(expected);
    expect(first.items).toHaveLength(1_000);

    const last = await repos.audit.list(ctx, { filters, page: 2, pageSize: 1_000 });
    expect(last.items).toHaveLength(expected - 1_000);
    const ids = new Set([...first.items, ...last.items].map((e) => e.id));
    expect(ids.size).toBe(expected);
  });
});
