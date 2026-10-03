'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import type { FormState } from '@/app/actions/auth';
import { requestPasswordResetAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestPasswordResetAction, null);
  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="username" aria-invalid={state?.fieldErrors?.email ? true : undefined} />
        {state?.fieldErrors?.email ? (
          <p role="alert" className="text-destructive text-sm">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>
      {state?.message ? (
        <p role="status" className="text-sm text-green-800">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" className="h-10 w-full" disabled={pending}>
        Envoyer le lien
      </Button>
      <p className="text-sm">
        <Link href="/connexion" className="underline">
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}
