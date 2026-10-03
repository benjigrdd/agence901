import type { Metadata } from 'next';

import { setPasswordAction } from '@/app/actions/auth';
import { AuthShell } from '@/components/auth/auth-shell';
import { PasswordForm } from '@/components/auth/password-form';

export const metadata: Metadata = { title: 'Nouveau mot de passe' };

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Choisir un nouveau mot de passe">
      <PasswordForm
        action={setPasswordAction}
        submitLabel="Enregistrer le mot de passe"
        mode="reset"
      />
    </AuthShell>
  );
}
