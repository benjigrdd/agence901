import { ShieldX } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function ForbiddenContent() {
  return (
    <main id="contenu" className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <ShieldX className="text-muted-foreground size-12" aria-hidden="true" />
      <h1 className="text-2xl font-semibold">Accès refusé</h1>
      <p className="text-muted-foreground max-w-md">
        Vous n’avez pas les droits nécessaires pour accéder à cette page. Si vous pensez qu’il s’agit d’une erreur,
        contactez un administrateur de votre commune.
      </p>
      <Button asChild>
        <Link href="/">Retour à l’accueil</Link>
      </Button>
    </main>
  );
}
