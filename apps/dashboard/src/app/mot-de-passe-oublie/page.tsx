import type { Metadata } from 'next';

import { ForgotPasswordForm } from './forgot-password-form';

export const metadata: Metadata = { title: 'Mot de passe oublié' };

export default function ForgotPasswordPage() {
  return (
    <main id="contenu" className="mx-auto w-full max-w-md flex-1 p-6 sm:p-10">
      <h1 className="text-2xl font-semibold">Mot de passe oublié</h1>
      <p className="text-muted-foreground mt-2">Saisissez votre email : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
      <ForgotPasswordForm />
    </main>
  );
}
