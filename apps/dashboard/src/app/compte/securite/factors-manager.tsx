'use client';

import { formatDateFr } from '@app/shared';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { removeFactorAction } from '@/app/actions/auth';
import { MfaSetup } from '@/components/auth/mfa-setup';
import { Button } from '@/components/ui/button';

type Factor = { id: string; name: string; createdAt: string };

export function FactorsManager({ factors }: { factors: Factor[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <section aria-labelledby="facteurs" className="space-y-3">
      <h2 id="facteurs" className="text-lg font-semibold">
        Appareils de double authentification
      </h2>
      <ul className="divide-y rounded-lg border">
        {factors.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-2 p-3 text-sm">
            <span>
              {f.name} <span className="text-muted-foreground">· ajouté le {formatDateFr(new Date(f.createdAt), 'd MMM yyyy')}</span>
            </span>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending || factors.length <= 1}
              onClick={() =>
                startTransition(async () => {
                  const r = await removeFactorAction(f.id);
                  if (r.error) toast.error(r.error);
                  else {
                    toast.success('Appareil supprimé');
                    router.refresh();
                  }
                })
              }
            >
              Supprimer<span className="sr-only"> {f.name}</span>
            </Button>
          </li>
        ))}
      </ul>
      {factors.length <= 1 ? <p className="text-muted-foreground text-sm">Ajoutez un second appareil avant de pouvoir supprimer le premier.</p> : null}
      {adding ? <MfaSetup next="/compte/securite" secondDevice /> : <Button onClick={() => setAdding(true)}>Ajouter un appareil de secours</Button>}
    </section>
  );
}
