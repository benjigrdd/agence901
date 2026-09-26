'use server';

import { isPersonaKey } from '@app/data';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { isMockDataSource } from '@/server/repos';
import { PERSONA_COOKIE } from '@/server/session';

/** Mock uniquement : choisit la persona de developpement puis recharge l'application. */
export async function setPersona(formData: FormData): Promise<void> {
  if (!isMockDataSource()) return;
  const key = formData.get('persona');
  if (typeof key !== 'string' || !isPersonaKey(key)) return;
  (await cookies()).set(PERSONA_COOKIE, key, { httpOnly: true, sameSite: 'lax', path: '/' });
  redirect('/');
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(PERSONA_COOKIE);
  redirect('/connexion');
}
