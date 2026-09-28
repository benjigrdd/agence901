import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { json } from './cors.ts';

/** Client de l'appelant (son jeton) : droits verifies par la base (RLS, 2FA). */
export function callerClient(req: Request): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
}

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** URL d'une source externe : surchargeable uniquement en local (tests avec un faux service). */
export function sourceUrl(override: unknown, fallback: string): string {
  const local = /kong|127\.0\.0\.1/.test(Deno.env.get('SUPABASE_URL') ?? '');
  return local && typeof override === 'string' && override.startsWith('http') ? override : fallback;
}

/** Niveau d'authentification du jeton de l'appelant (`aal2` = 2FA validee). Jeton deja verifie par `auth.getUser()`. */
export function callerAal(req: Request): string | null {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  try {
    const payload = token.split('.')[1] ?? '';
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
      aal?: unknown;
    };
    return typeof claims.aal === 'string' ? claims.aal : null;
  } catch {
    return null;
  }
}

/** Temporisation Overpass (politique d'usage) : une requete a la fois par commune, 30 s entre deux. */
export const OVERPASS_COOLDOWN_MS = 30_000;

/** Limitation du debit par utilisateur et par minute (table `rate_limits`) : reponse 429, ou `null`. */
export async function rateLimited(caller: SupabaseClient, action: string, perMinute: number): Promise<Response | null> {
  const { data } = await caller.rpc('consume_rate_limit', { p_action: action, p_max: perMinute });
  return data === true ? null : json({ code: 'APP_BUSY', error: 'Trop de demandes : réessayez dans une minute.' }, 429);
}
