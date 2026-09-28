import { isSupabaseMode, supabasePublicKey, supabaseUrl } from '@/lib/supabase/env';

/**
 * Disponibilite pour une surveillance externe : 200 si le dashboard et Supabase (API et base)
 * repondent, 503 sinon. Aucune donnee de commune n'est lue ni renvoyee.
 */
export async function GET(): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store' };
  if (!isSupabaseMode()) return Response.json({ status: 'ok', dataSource: 'mock' }, { headers });
  const started = Date.now();
  try {
    // Requete legere sur une table publique vide pour l'anonyme (RLS) : verifie API et base.
    const response = await fetch(`${supabaseUrl()}/rest/v1/tenants?select=id&limit=0`, {
      headers: { apikey: supabasePublicKey() },
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    });
    const ok = response.ok;
    return Response.json({ status: ok ? 'ok' : 'degraded', database: ok ? 'ok' : 'error', latencyMs: Date.now() - started }, { status: ok ? 200 : 503, headers });
  } catch {
    return Response.json({ status: 'degraded', database: 'unreachable', latencyMs: Date.now() - started }, { status: 503, headers });
  }
}
