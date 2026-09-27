'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import type { FormState } from '@/app/actions/auth';
import { signInAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signInAction, null);
  return (
    <form action={action} className="mt-6 max-w-sm space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required aria-describedby={state?.error ? 'connexion-erreur' : undefined} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Mot de passe</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required aria-describedby={state?.error ? 'connexion-erreur' : undefined} />
      </div>
      {state?.error ? (
        <p id="connexion-erreur" role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        Se connecter
      </Button>
      <p className="text-sm">
        <Link href="/mot-de-passe-oublie" className="underline">
          Mot de passe oublié
        </Link>
      </p>
    </form>
  );
}
