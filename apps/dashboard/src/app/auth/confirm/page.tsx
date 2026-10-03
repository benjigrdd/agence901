import type { Metadata } from 'next';

import { confirmEmailLinkAction } from '@/app/actions/auth';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Confirmer' };

const first = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? (value[0] ?? '') : (value ?? '');

/**
 * Arrivee depuis un email (invitation, reinitialisation). Rien n'est verifie a l'ouverture : le jeton est a
 * usage unique et les robots de messagerie ouvrent les liens ; il n'est consomme qu'au clic sur « Continuer ».
 */
export default async function ConfirmEmailLinkPage({ searchParams }: PageProps<'/auth/confirm'>) {
  const params = await searchParams;
  const type = first(params.type);
  const title =
    type === 'invite' ? 'Rejoindre l’espace de gestion' : 'Choisir un nouveau mot de passe';

  return (
    <AuthShell
      title={title}
      description="Cliquez sur « Continuer » pour valider le lien reçu par email."
    >
      <form action={confirmEmailLinkAction} className="mt-6">
        <input type="hidden" name="token_hash" value={first(params.token_hash)} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="code" value={first(params.code)} />
        <input type="hidden" name="next" value={first(params.next)} />
        <Button type="submit" className="h-10 w-full">
          Continuer
        </Button>
      </form>
    </AuthShell>
  );
}
