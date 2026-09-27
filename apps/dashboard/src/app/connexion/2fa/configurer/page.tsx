import type { Metadata } from 'next';

import { MfaSetup } from '@/components/auth/mfa-setup';

export const metadata: Metadata = { title: 'Configurer la double authentification' };

export default async function MfaSetupPage({ searchParams }: PageProps<'/connexion/2fa/configurer'>) {
  const { next } = await searchParams;
  return (
    <main id="contenu" className="mx-auto w-full max-w-xl flex-1 p-6 sm:p-10">
      <h1 className="text-2xl font-semibold">Configurer la double authentification</h1>
      <p className="text-muted-foreground mt-2">
        La double authentification est obligatoire pour accéder à l’espace de gestion. Installez une application d’authentification
        (par exemple une application libre comme Aegis ou FreeOTP), puis ajoutez ce compte.
      </p>
      <MfaSetup next={typeof next === 'string' && next.startsWith('/') ? next : '/'} />
    </main>
  );
}
