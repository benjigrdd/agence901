import type { Metadata } from 'next';

import { setPasswordAction } from '@/app/actions/auth';
import { PasswordForm } from '@/components/auth/password-form';

export const metadata: Metadata = { title: 'Invitation' };

export default function InvitationPage() {
  return (
    <main id="contenu" className="mx-auto w-full max-w-md flex-1 p-6 sm:p-10">
      <h1 className="text-2xl font-semibold">Bienvenue</h1>
      <p className="text-muted-foreground mt-2">Choisissez votre mot de passe, puis configurez la double authentification.</p>
      <PasswordForm action={setPasswordAction} submitLabel="Continuer" mode="invitation" />
    </main>
  );
}
