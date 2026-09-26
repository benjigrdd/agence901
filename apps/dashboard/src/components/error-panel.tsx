'use client';

import { TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';

type ErrorPanelProps = { reset: () => void };

/** Contenu commun des `error.tsx` : aucun detail technique affiche. */
export function ErrorPanel({ reset }: ErrorPanelProps) {
  return (
    <div role="alert" className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <TriangleAlert className="text-destructive size-10" aria-hidden="true" />
      <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
      <p className="text-muted-foreground max-w-md">
        L’opération n’a pas pu aboutir. Réessayez ; si le problème persiste, contactez le support.
      </p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
