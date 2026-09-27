'use client';

import { useActionState } from 'react';

import type { FormState } from '@/app/actions/auth';
import { verifyMfaAction } from '@/app/actions/auth';
import { signOut } from '@/app/actions/session';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function MfaVerifyForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(verifyMfaAction, null);
  return (
    <div className="mt-6 space-y-4">
      <form action={action} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <div className="space-y-1">
          <Label htmlFor="code">Code de vérification</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            className="w-40 font-mono text-lg tracking-widest"
            aria-describedby={state?.error ? 'code-erreur' : undefined}
            aria-invalid={state?.error ? true : undefined}
            autoFocus
          />
        </div>
        {state?.error ? (
          <p id="code-erreur" role="alert" className="text-destructive text-sm">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          Valider
        </Button>
      </form>
      <form action={signOut}>
        <Button type="submit" variant="link" className="px-0">
          Utiliser un autre compte
        </Button>
      </form>
    </div>
  );
}
