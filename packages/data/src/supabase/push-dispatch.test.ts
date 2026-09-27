import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { resolve as resolvePath } from 'node:path';

import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ctxOf } from '../contract';
import { TENANT_IDS } from '../personas';
import type { Database } from './database.types';
import { createSupabaseRepositories } from './index';
import { LOCAL_SUPABASE_URL, localPersonaResolver } from './local-personas';

/**
 * Envoi reel par l'Edge Function `dispatch-notifications`, vers un FAUX service Expo (aucun envoi reel).
 * Supabase local avec le runtime des fonctions : SUPABASE_CONTRACT=1.
 */
const run = process.env.SUPABASE_CONTRACT === '1' ? describe : describe.skip;
const STUB_PORT = 54999;

run('notifications push (Edge Function)', () => {
  const received: { to: string; title?: string; channelId?: string }[] = [];
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (c: Buffer) => (body += c.toString()));
    req.on('end', () => {
      const messages: { to: string; title?: string; channelId?: string }[] = req.url?.endsWith('/send') ? JSON.parse(body) : [];
      received.push(...messages);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ data: req.url?.endsWith('/send') ? messages.map((_, i) => ({ status: 'ok', id: `ticket-${i}` })) : {} }));
    });
  });
  let serviceKey = '';

  beforeAll(async () => {
    await new Promise<void>((resolve) => server.listen(STUB_PORT, '0.0.0.0', resolve));
    const raw = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], { cwd: resolvePath(import.meta.dirname, '../../../..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const status: unknown = JSON.parse(raw.slice(raw.indexOf('{')));
    serviceKey = status && typeof status === 'object' ? String(Reflect.get(status, 'SERVICE_ROLE_KEY')) : '';
  });
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it('une notification ciblée part vers les jetons des habitants concernés', async () => {
    const service = createClient<Database>(LOCAL_SUPABASE_URL, serviceKey, { auth: { persistSession: false } });
    const citizens = (await service.from('citizen_profiles').select('user_id').eq('tenant_id', TENANT_IDS.alpha).limit(3)).data ?? [];
    const tokens = citizens.map((c, i) => ({ tenant_id: TENANT_IDS.alpha, user_id: c.user_id, token: `ExponentPushToken[test-${crypto.randomUUID()}-${i}]`, platform: 'ios' as const }));
    expect((await service.from('push_tokens').insert(tokens)).error).toBeNull();

    const repos = createSupabaseRepositories(localPersonaResolver());
    const notification = await repos.notifications.create(ctxOf('admin-alpha', 'alpha'), {
      title: 'Coupure d’eau',
      body: 'Rue des Lilas, de 9 h à 12 h.',
      target: { type: 'all', ids: [] },
      linkedEntity: null,
      scheduledAt: null,
      urgent: true,
      justification: null,
    });

    const response = await fetch(`${LOCAL_SUPABASE_URL}/functions/v1/dispatch-notifications`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expoUrl: `http://host.docker.internal:${STUB_PORT}` }),
    });
    expect(response.status).toBe(200);
    const sent = received.filter((m) => m.title === 'Coupure d’eau');
    expect(sent.map((m) => m.to)).toEqual(expect.arrayContaining(tokens.map((t) => t.token)));

    const after = (await service.from('notifications').select('status, sent_at, stats').eq('id', notification.id).single()).data;
    expect(after?.status).toBe('sent');
    expect(after?.sent_at).not.toBeNull();
    const deliveries = (await service.from('notification_deliveries').select('ticket_id, push_token_id').eq('notification_id', notification.id)).data ?? [];
    expect(deliveries.length).toBeGreaterThanOrEqual(tokens.length);
    expect(deliveries.every((d) => d.ticket_id?.startsWith('ticket-'))).toBe(true);

    // Sans cle service : refuse.
    const denied = await fetch(`${LOCAL_SUPABASE_URL}/functions/v1/dispatch-notifications`, { method: 'POST', headers: { Authorization: 'Bearer faux' } });
    expect(denied.status).toBe(401);
  });
});
