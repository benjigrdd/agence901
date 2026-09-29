import type { DataContext, Repositories } from '@app/data';
import { createRepositories, PERSONA_SESSIONS, TENANT_SLUGS } from '@app/data';
import type { GeoPoint, Session } from '@app/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/** Commune de l'app, fixée au build (une app par commune). */
export const TENANT_SLUG = process.env.EXPO_PUBLIC_TENANT_SLUG || TENANT_SLUGS.alpha;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const useSupabase = process.env.EXPO_PUBLIC_DATA_SOURCE === 'supabase';

const supabase =
  useSupabase && SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

if (useSupabase && !supabase) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY sont requis avec EXPO_PUBLIC_DATA_SOURCE=supabase.',
  );
}

/** Seul accès aux données de l'app : les dépôts de `@app/data` (RLS appliquée avec la session de l'habitant). */
export const repos: Repositories = supabase
  ? createRepositories({ source: 'supabase', resolve: () => supabase })
  : createRepositories({ source: 'mock' });

/** Session anonyme de l'habitant (aucun compte à créer), réutilisée d'un lancement à l'autre. */
async function citizenSession(): Promise<Session> {
  if (!supabase) return PERSONA_SESSIONS['citizen-alpha'];
  const { data } = await supabase.auth.getSession();
  let userId = data.session?.user.id;
  if (!userId) {
    const { data: signIn, error } = await supabase.auth.signInAnonymously();
    if (error || !signIn.user) throw new Error('Connexion au service de la commune impossible.');
    userId = signIn.user.id;
  }
  return { userId, isPlatformAdmin: false, aal: 'aal1', memberships: [] };
}

export async function bootstrap(): Promise<{
  ctx: DataContext;
  tenantName: string;
  inseeCode: string;
  center: GeoPoint;
}> {
  const tenant = await repos.tenants.getPublicBySlug(TENANT_SLUG);
  const session = await citizenSession();
  const ctx: DataContext = { session, tenantId: tenant.id };
  await repos.citizen.getOrCreateProfile(ctx);
  // Mesure d'usage sans traceur : date du jour uniquement.
  await repos.citizen.touch(ctx).catch(() => undefined);
  return { ctx, tenantName: tenant.name, inseeCode: tenant.inseeCode, center: tenant.center };
}

/** Supprime les données de l'habitant (RGPD) puis ferme la session anonyme. */
export async function deleteMyData(ctx: DataContext): Promise<void> {
  await repos.citizen.deleteMyData(ctx);
  await supabase?.auth.signOut();
}
