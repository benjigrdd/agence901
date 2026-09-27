import { createHmac } from 'node:crypto';

import type { Session } from '@app/shared';
import { createClient } from '@supabase/supabase-js';

import type { SessionContext } from '../context';
import type { ClientResolver, Db } from './core';
import type { Database } from './database.types';

/**
 * Supabase LOCAL uniquement (tests de contrat) : un client par session de persona, avec un jeton signe
 * par le secret JWT local par defaut de la CLI (public, identique sur tous les postes, jamais en production).
 */
export const LOCAL_SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const LOCAL_JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';
export const LOCAL_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const base64url = (value: string | Buffer) => Buffer.from(value).toString('base64url');

export function signLocalJwt(session: Session): string {
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(LOCAL_SUPABASE_URL)) {
    throw new Error('Jetons de test refusés hors Supabase local');
  }
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      sub: session.userId,
      role: 'authenticated',
      aud: 'authenticated',
      aal: session.aal,
      iat: now,
      exp: now + 3600,
      app_metadata: { platform_admin: session.isPlatformAdmin },
      is_anonymous: session.memberships.length === 0 && !session.isPlatformAdmin,
    }),
  );
  const signature = base64url(createHmac('sha256', LOCAL_JWT_SECRET).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${signature}`;
}

export function localPersonaResolver(): ClientResolver {
  const cache = new Map<string, Db>();
  return (ctx: SessionContext) => {
    const key = ctx.session ? `${ctx.session.userId}:${ctx.session.aal}` : 'anon';
    let client = cache.get(key);
    if (!client) {
      client = createClient<Database>(LOCAL_SUPABASE_URL, LOCAL_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: ctx.session ? { headers: { Authorization: `Bearer ${signLocalJwt(ctx.session)}` } } : {},
      });
      cache.set(key, client);
    }
    return client;
  };
}
