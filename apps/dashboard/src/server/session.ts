import 'server-only';

import type { PersonaKey } from '@app/data';
import { isPersonaKey, PERSONAS } from '@app/data';
import { createMockEnvironment } from '@app/data/mock';
import type { Session } from '@app/shared';
import { ROLE_LABELS } from '@app/shared';
import { cookies } from 'next/headers';
import { cache } from 'react';

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

/**
 * Session du personnel. En mock : persona choisie (cookie `dev_persona`).
 * Au lot 13 : Supabase Auth, avec la meme signature.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  if (!isMockDataSource()) return null;
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

export function describeUser(session: Session, tenantId: string | null): CurrentUser {
  const profile = isMockDataSource() ? createMockEnvironment().store.profiles.get(session.userId) : undefined;
  const membership = tenantId ? session.memberships.find((m) => m.tenantId === tenantId) : undefined;
  const roleLabel = membership ? ROLE_LABELS[membership.role] : session.isPlatformAdmin ? 'Éditeur' : 'Personnel';
  return { displayName: profile?.displayName ?? 'Utilisateur', roleLabel };
}
