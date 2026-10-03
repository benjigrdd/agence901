import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { MfaSetup } from '@/components/auth/mfa-setup';

export const metadata: Metadata = { title: 'Configurer la double authentification' };

export default async function MfaSetupPage({
  searchParams,
}: PageProps<'/connexion/2fa/configurer'>) {
  const { next } = await searchParams;
  return (
    <AuthShell
      title="Configurer la double authentification"
      size="wide"
      description={
        <>
          La double authentification est obligatoire pour accéder à l’espace de gestion. Installez
          une application d’authentification (par exemple une application libre comme Aegis ou
          FreeOTP), puis ajoutez ce compte.
        </>
      }
    >
      <MfaSetup next={typeof next === 'string' && next.startsWith('/') ? next : '/'} />
    </AuthShell>
  );
}
