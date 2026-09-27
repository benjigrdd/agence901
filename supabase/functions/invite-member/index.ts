// Invitation d'un membre du personnel. Seule cette fonction utilise la cle service (jamais le dashboard).
// L'appelant (JWT de l'utilisateur) doit etre admin de la commune ou editeur, en 2FA validee.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders, json } from '../_shared/cors.ts';

const MODULES = ['news', 'events', 'reports', 'map', 'mobility', 'procedures', 'participation', 'notifications', 'services', 'environment', 'media', 'districts', 'settings', 'audit'];
const LEVELS = ['read', 'edit', 'publish'];
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Body = { tenantId?: unknown; email?: unknown; displayName?: unknown; role?: unknown; permissions?: unknown };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const siteUrl = Deno.env.get('SITE_URL') ?? 'http://127.0.0.1:3000';
  const authorization = req.headers.get('Authorization') ?? '';

  const body = (await req.json().catch(() => ({}))) as Body;
  const tenantId = typeof body.tenantId === 'string' && UUID.test(body.tenantId) ? body.tenantId : null;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
  const role = body.role === 'admin' || body.role === 'agent' ? body.role : null;
  const permissions: Record<string, string> = {};
  if (body.permissions && typeof body.permissions === 'object') {
    for (const [module, level] of Object.entries(body.permissions as Record<string, unknown>)) {
      if (MODULES.includes(module) && typeof level === 'string' && LEVELS.includes(level)) permissions[module] = level;
    }
  }
  if (!tenantId || !EMAIL.test(email) || displayName.length < 1 || displayName.length > 100 || !role) {
    return json({ code: 'APP_INVALID_INPUT', error: 'Invitation invalide' }, 400);
  }

  // 1. Droits de l'appelant, evalues avec SON jeton (RLS et 2FA).
  const asCaller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: caller } = await asCaller.auth.getUser();
  const { data: allowed } = await asCaller.rpc('can_manage_members', { p_tenant_id: tenantId });
  if (!caller.user || allowed !== true) return json({ code: 'APP_FORBIDDEN', error: 'Action réservée aux administrateurs' }, 403);

  // 2. Compte Auth : invitation par email, ou compte existant.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const redirectTo = `${siteUrl}/auth/confirm?next=/invitation`;
  let userId: string | null = null;
  const invited = await admin.auth.admin.inviteUserByEmail(email, { redirectTo, data: { display_name: displayName } });
  if (invited.data.user) {
    userId = invited.data.user.id;
  } else {
    // Deja inscrit (autre commune) : on retrouve son identifiant sans envoyer de lien.
    const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    userId = link.data.user?.id ?? null;
  }
  if (!userId) return json({ code: 'APP_INVITE_FAILED', error: 'Invitation impossible' }, 400);

  // 3. Profil, appartenance et droits (atomique, audite avec l'appelant comme acteur).
  const { data: membershipId, error } = await admin.rpc('record_invitation', {
    p_tenant_id: tenantId,
    p_user_id: userId,
    p_display_name: displayName,
    p_role: role,
    p_permissions: permissions,
    p_actor_id: caller.user.id,
  });
  if (error) {
    const code = error.message.startsWith('APP_') ? error.message : 'APP_INVITE_FAILED';
    return json({ code, error: error.details || 'Invitation impossible' }, code === 'APP_ALREADY_MEMBER' ? 409 : 400);
  }
  return json({ membershipId, userId });
});
