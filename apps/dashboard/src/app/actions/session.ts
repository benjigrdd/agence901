'use server';

import { isPersonaKey } from '@app/data';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isMockDataSource } from '@/server/repos';
import { invitedMembers, MEMBER_PERSONA_PREFIX, PERSONA_COOKIE } from '@/server/session';

/** Mock uniquement : choisit la persona de developpement puis recharge l'application. */
export async function setPersona(formData: FormData): Promise<void> {
  if (!isMockDataSource()) return;
  const key = formData.get('persona');
  if (typeof key !== 'string' || !isPersonaKey(key)) return;
  (await cookies()).set(PERSONA_COOKIE, key, { httpOnly: true, sameSite: 'lax', path: '/' });
  redirect('/');
}

/** Mock uniquement : se connecter en tant que membre invite pendant la demo. */
export async function setMemberPersona(formData: FormData): Promise<void> {
  if (!isMockDataSource()) return;
  const userId = formData.get('userId');
  if (typeof userId !== 'string' || !invitedMembers().some((m) => m.userId === userId)) return;
  (await cookies()).set(PERSONA_COOKIE, `${MEMBER_PERSONA_PREFIX}${userId}`, { httpOnly: true, sameSite: 'lax', path: '/' });
  redirect('/');
}

export async function signOut(): Promise<void> {
  if (!isMockDataSource()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut({ scope: 'local' });
  }
  (await cookies()).delete(PERSONA_COOKIE);
  redirect('/connexion');
}
