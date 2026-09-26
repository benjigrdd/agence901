import { SearchX } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Page introuvable' };

export default function NotFound() {
  return (
    <main id="contenu" className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <SearchX className="text-muted-foreground size-12" aria-hidden="true" />
      <h1 className="text-2xl font-semibold">Page introuvable</h1>
      <p className="text-muted-foreground max-w-md">
        Cette page n’existe pas ou vous n’y avez pas accès. Vérifiez l’adresse ou revenez à l’accueil.
      </p>
      <Button asChild>
        <Link href="/">Retour à l’accueil</Link>
      </Button>
    </main>
  );
}
