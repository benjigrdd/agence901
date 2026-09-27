// Envoi via l'API Expo Push (par lots de 100). Le jeton d'acces Expo est lu dans l'environnement de la fonction.
export type PushMessage = { to: string; title?: string; body: string; data?: Record<string, unknown>; channelId?: string; sound?: 'default'; priority?: 'high' | 'normal' };
export type Ticket = { status: 'ok' | 'error'; id?: string; message?: string; details?: { error?: string } };

const DEFAULT_EXPO_URL = 'https://exp.host/--/api/v2/push';

/** URL de l'API : surchargeable uniquement en local (tests avec un faux service). */
export function expoBaseUrl(override: unknown): string {
  const local = (Deno.env.get('SUPABASE_URL') ?? '').includes('kong') || (Deno.env.get('SUPABASE_URL') ?? '').includes('127.0.0.1');
  return local && typeof override === 'string' && override.startsWith('http') ? override : DEFAULT_EXPO_URL;
}

function headers(): HeadersInit {
  const token = Deno.env.get('EXPO_ACCESS_TOKEN');
  return { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export async function sendPush(baseUrl: string, messages: PushMessage[]): Promise<Ticket[]> {
  const tickets: Ticket[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const response = await fetch(`${baseUrl}/send`, { method: 'POST', headers: headers(), body: JSON.stringify(batch) });
    if (!response.ok) throw new Error(`Expo ${response.status}`);
    const json = (await response.json()) as { data?: Ticket[] };
    tickets.push(...(json.data ?? batch.map(() => ({ status: 'error' as const, message: 'Réponse Expo invalide' }))));
  }
  return tickets;
}

export async function fetchReceipts(baseUrl: string, ids: string[]): Promise<Record<string, Ticket>> {
  const receipts: Record<string, Ticket> = {};
  for (let i = 0; i < ids.length; i += 300) {
    const response = await fetch(`${baseUrl}/getReceipts`, { method: 'POST', headers: headers(), body: JSON.stringify({ ids: ids.slice(i, i + 300) }) });
    if (!response.ok) continue;
    const json = (await response.json()) as { data?: Record<string, Ticket> };
    Object.assign(receipts, json.data ?? {});
  }
  return receipts;
}

/** Appel reserve a la cle service (pg_cron / exploitation). */
export function isServiceCall(req: Request): boolean {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return key.length > 0 && req.headers.get('Authorization') === `Bearer ${key}`;
}
