import type { Metadata } from 'next';

import { setPasswordAction } from '@/app/actions/auth';
import { PasswordForm } from '@/components/auth/password-form';

export const metadata: Metadata = { title: 'Nouveau mot de passe' };

export default function ResetPasswordPage() {
  return (
    <main id="contenu" className="mx-auto w-full max-w-md flex-1 p-6 sm:p-10">
      <h1 className="text-2xl font-semibold">Choisir un nouveau mot de passe</h1>
      <PasswordForm action={setPasswordAction} submitLabel="Enregistrer le mot de passe" mode="reset" />
    </main>
  );
}
