// RGPD : « Supprimer mes donnees » depuis l'app. L'habitant est identifie par SON jeton ; ses signalements
// restent (utiles a la commune) mais sont detaches et sans email ; le compte Auth est supprime.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders, json } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const asCaller = createClient(url, anonKey, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data } = await asCaller.auth.getUser();
  const user = data.user;
  if (!user) return json({ code: 'APP_FORBIDDEN', error: 'Session requise' }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  // Le personnel ne supprime pas son compte par cette voie (gestion par l'administrateur de la commune).
  const { count } = await admin.from('memberships').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
  if ((count ?? 0) > 0) return json({ code: 'APP_FORBIDDEN', error: 'Compte du personnel : contactez votre administrateur' }, 403);

  const anonymized = await admin.rpc('anonymize_citizen', { p_user_id: user.id });
  if (anonymized.error) return json({ code: 'APP_DELETE_FAILED', error: 'Suppression impossible' }, 500);
  const deleted = await admin.auth.admin.deleteUser(user.id);
  if (deleted.error) return json({ code: 'APP_DELETE_FAILED', error: 'Suppression impossible' }, 500);
  return json({ deleted: true });
});
