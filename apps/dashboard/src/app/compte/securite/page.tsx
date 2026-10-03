import type { Metadata } from 'next';

import { changePasswordAction } from '@/app/actions/auth';
import { PasswordForm } from '@/components/auth/password-form';
import { isSupabaseMode } from '@/lib/supabase/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireSession } from '@/server/guards';

import { FactorsManager } from './factors-manager';

export const metadata: Metadata = { title: 'Sécurité du compte' };

export default async function AccountSecurityPage() {
  await requireSession();
  if (!isSupabaseMode()) {
    return (
      <main id="contenu" className="mx-auto w-full max-w-2xl flex-1 p-6 sm:p-10">
        <h1 className="text-2xl font-semibold">Sécurité du compte</h1>
        <p className="text-muted-foreground mt-2">
          Mode démonstration : la gestion de la double authentification nécessite Supabase.
        </p>
      </main>
    );
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const factors = (data?.totp ?? [])
    .filter((f) => f.status === 'verified')
    .map((f) => ({ id: f.id, name: f.friendly_name ?? 'Appareil', createdAt: f.created_at }));
  return (
    <main id="contenu" className="mx-auto w-full max-w-2xl flex-1 space-y-10 p-6 sm:p-10">
      <h1 className="text-2xl font-semibold">Sécurité du compte</h1>
      <FactorsManager factors={factors} />
      <section aria-labelledby="mdp" className="space-y-2">
        <h2 id="mdp" className="text-lg font-semibold">
          Changer de mot de passe
        </h2>
        <div className="max-w-sm">
          <PasswordForm
            action={changePasswordAction}
            submitLabel="Changer le mot de passe"
            mode="change"
          />
        </div>
      </section>
    </main>
  );
}
