import { execFileSync } from 'node:child_process';
import { resolve as resolvePath } from 'node:path';

import { createClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';

import type { Database } from './database.types';
import { LOCAL_SUPABASE_URL } from './local-personas';

/**
 * Alerte « tache en echec deux fois de suite » : Edge Function `job-alerts` vers le serveur SMTP de
 * developpement (Mailpit de Supabase local). Supabase local : SUPABASE_CONTRACT=1.
 */
const run = process.env.SUPABASE_CONTRACT === '1' ? describe : describe.skip;
const MAILPIT = 'http://127.0.0.1:54324/api/v1';

run('alertes des tâches planifiées (Edge Function)', () => {
  let serviceKey = '';
  beforeAll(() => {
    const raw = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], { cwd: resolvePath(import.meta.dirname, '../../../..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const status: unknown = JSON.parse(raw.slice(raw.indexOf('{')));
    serviceKey = status && typeof status === 'object' ? String(Reflect.get(status, 'SERVICE_ROLE_KEY')) : '';
  });

  it('deux échecs consécutifs → un email à l’éditeur, sans donnée de commune', async () => {
    const admin = createClient<Database>(LOCAL_SUPABASE_URL, serviceKey, { auth: { persistSession: false } });
    const job = `test-alerte-${Date.now()}`;
    const at = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
    await admin.from('job_runs').insert([
      { job, status: 'success', started_at: at(30), finished_at: at(30) },
      { job, status: 'failed', started_at: at(20), finished_at: at(20) },
      { job, status: 'failed', started_at: at(10), finished_at: at(10) },
    ]);
    const { data: health } = await admin.from('job_health').select('*').eq('job', job).single();
    expect(health).toMatchObject({ job, last_status: 'failed', failing: true });

    const to = `alertes-${Date.now()}@exemple.test`;
    const { data, error } = await admin.functions.invoke<{ failing: string[]; sent: boolean }>('job-alerts', {
      body: { smtpHost: 'inbucket', smtpPort: 1025, alertTo: to },
    });
    expect(error).toBeNull();
    expect(data?.sent).toBe(true);
    expect(data?.failing).toContain(job);

    const search: unknown = await (await fetch(`${MAILPIT}/search?query=${encodeURIComponent(`to:${to}`)}`)).json();
    const messages: unknown = search && typeof search === 'object' ? Reflect.get(search, 'messages') : null;
    const first: unknown = Array.isArray(messages) ? messages[0] : null;
    const id = first && typeof first === 'object' ? String(Reflect.get(first, 'ID')) : '';
    expect(id).not.toBe('');
    const detail: unknown = await (await fetch(`${MAILPIT}/message/${id}`)).json();
    expect(detail && typeof detail === 'object' ? String(Reflect.get(detail, 'Text')) : '').toContain(job);

    // Une execution reussie retablit l'etat.
    await admin.from('job_runs').insert({ job, status: 'success', started_at: at(1), finished_at: at(1) });
    const { data: after } = await admin.from('job_health').select('failing').eq('job', job).single();
    expect(after?.failing).toBe(false);
  });
});
