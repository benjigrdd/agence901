import type { Metadata } from 'next';

import { setPasswordAction } from '@/app/actions/auth';
import { AuthShell } from '@/components/auth/auth-shell';
import { PasswordForm } from '@/components/auth/password-form';

export const metadata: Metadata = { title: 'Invitation' };

export default function InvitationPage() {
  return (
    <AuthShell
      title="Bienvenue"
      description="Choisissez votre mot de passe, puis configurez la double authentification."
    >
      <PasswordForm action={setPasswordAction} submitLabel="Continuer" mode="invitation" />
    </AuthShell>
  );
}
