import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { isSupabaseMode } from '@/lib/supabase/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import { MfaVerifyForm } from './mfa-verify-form';

export const metadata: Metadata = { title: 'Double authentification' };

export default async function MfaPage({ searchParams }: PageProps<'/connexion/2fa'>) {
  const { next } = await searchParams;
  if (isSupabaseMode()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.nextLevel !== 'aal2') redirect('/connexion/2fa/configurer');
  }
  return (
    <main id="contenu" className="mx-auto w-full max-w-md flex-1 p-6 sm:p-10">
      <h1 className="text-2xl font-semibold">Double authentification</h1>
      <p className="text-muted-foreground mt-2">Saisissez le code à 6 chiffres affiché par votre application d’authentification.</p>
      <MfaVerifyForm next={typeof next === 'string' && next.startsWith('/') ? next : '/'} />
    </main>
  );
}
