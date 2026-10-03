import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AuthShell } from '@/components/auth/auth-shell';
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
    <AuthShell
      title="Double authentification"
      description="Saisissez le code à 6 chiffres affiché par votre application d’authentification."
    >
      <MfaVerifyForm next={typeof next === 'string' && next.startsWith('/') ? next : '/'} />
    </AuthShell>
  );
}
