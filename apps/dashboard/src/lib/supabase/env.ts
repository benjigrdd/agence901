/** Configuration publique de Supabase (URL et cle anonyme / publishable). La cle `service_role` n'est jamais utilisee ici. */
export function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL manquante');
  return url;
}

export function supabasePublicKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY (ou PUBLISHABLE_KEY) manquante');
  return key;
}

export function isSupabaseMode(): boolean {
  return process.env.DATA_SOURCE === 'supabase';
}
