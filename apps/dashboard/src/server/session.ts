import 'server-only';

import type { PersonaKey } from '@app/data';
import { isPersonaKey, PERSONAS } from '@app/data';
import { createMockEnvironment } from '@app/data/mock';
import type { Session } from '@app/shared';
import { ROLE_LABELS, SessionSchema } from '@app/shared';
import { cookies } from 'next/headers';
import { cache } from 'react';

import { createSupabaseServerClient } from '@/lib/supabase/server';

import { isMockDataSource } from './repos';

export const PERSONA_COOKIE = 'dev_persona';
/** Mock : membre cree par invitation pendant la demo (cookie `membre:<userId>`). */
export const MEMBER_PERSONA_PREFIX = 'membre:';

/** Membres du personnel ajoutes pendant la demo (hors personas predefinies). */
export function invitedMembers(): { userId: string; displayName: string }[] {
  if (!isMockDataSource()) return [];
  const { store } = createMockEnvironment();
  const known = new Set(Object.values(PERSONAS).map((p) => p.userId));
  const ids = [...new Set(store.memberships.all().filter((m) => !m.disabledAt && !known.has(m.userId)).map((m) => m.userId))];
  return ids.map((userId) => ({ userId, displayName: store.profiles.get(userId)?.displayName ?? 'Membre' }));
}

export async function getPersonaKey(): Promise<PersonaKey | null> {
  const value = (await cookies()).get(PERSONA_COOKIE)?.value;
  return value && isPersonaKey(value) ? value : null;
}

/** Session reelle (Supabase Auth) : utilisateur revalide, niveau 2FA, drapeau editeur, appartenances actives. */
async function getSupabaseSession(): Promise<Session | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const { data: rows } = await supabase
    .from('memberships')
    .select('tenant_id, role, membership_permissions (module, level)')
    .eq('user_id', user.id)
    .is('disabled_at', null);
  const parsed = SessionSchema.safeParse({
    userId: user.id,
    isPlatformAdmin: user.app_metadata.platform_admin === true,
    aal: aal?.currentLevel === 'aal2' ? 'aal2' : 'aal1',
    memberships: (rows ?? []).map((m) => ({
      tenantId: m.tenant_id,
      role: m.role,
      permissions: Object.fromEntries(m.membership_permissions.map((p) => [p.module, p.level])),
    })),
  });
  return parsed.success ? parsed.data : null;
}

/**
 * Session du personnel. En mock : persona choisie (cookie `dev_persona`).
 * Avec Supabase : utilisateur connecte, meme forme de `Session`. Mise en cache par requete.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  if (!isMockDataSource()) return getSupabaseSession();
  const raw = (await cookies()).get(PERSONA_COOKIE)?.value ?? '';
  if (raw.startsWith(MEMBER_PERSONA_PREFIX)) {
    const userId = raw.slice(MEMBER_PERSONA_PREFIX.length);
    return invitedMembers().some((m) => m.userId === userId) ? createMockEnvironment().sessionForUser(userId, 'aal2') : null;
  }
  const key = await getPersonaKey();
  if (!key) return null;
  const persona = PERSONAS[key];
  // Le dashboard est reserve au personnel.
  if (persona.kind === 'citizen') return null;
  return createMockEnvironment().sessionForUser(persona.userId, persona.aal);
});

export type CurrentUser = { displayName: string; roleLabel: string };

export async function describeUser(session: Session, tenantId: string | null): Promise<CurrentUser> {
  let displayName: string | undefined;
  if (isMockDataSource()) {
    displayName = createMockEnvironment().store.profiles.get(session.userId)?.displayName;
  } else {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from('profiles').select('display_name').eq('id', session.userId).maybeSingle();
    displayName = data?.display_name;
  }
  const membership = tenantId ? session.memberships.find((m) => m.tenantId === tenantId) : undefined;
  const roleLabel = membership ? ROLE_LABELS[membership.role] : session.isPlatformAdmin ? 'Éditeur' : 'Personnel';
  return { displayName: displayName ?? 'Utilisateur', roleLabel };
}
