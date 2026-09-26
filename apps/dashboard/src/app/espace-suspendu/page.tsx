import { PauseCircle } from 'lucide-react';
import type { Metadata } from 'next';

import { signOut } from '@/app/actions/session';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Espace suspendu' };

export default function SuspendedPage() {
  return (
    <main id="contenu" className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center gap-4 p-10 text-center">
      <PauseCircle className="text-muted-foreground size-10" aria-hidden="true" />
      <h1 className="text-2xl font-semibold">Espace suspendu</h1>
      <p className="text-muted-foreground">L’espace de gestion de votre commune est suspendu. Contactez votre éditeur pour en savoir plus.</p>
      <form action={signOut}>
        <Button type="submit" variant="outline">
          Se déconnecter
        </Button>
      </form>
    </main>
  );
}
