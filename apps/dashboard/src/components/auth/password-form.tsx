'use client';

import { PASSWORD_MIN_LENGTH, passwordStrength } from '@app/shared';
import { useActionState, useState } from 'react';

import type { FormState } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  mode?: 'reset' | 'invitation' | 'change';
};

/** Nouveau mot de passe avec jauge de robustesse (texte, pas seulement couleur). */
export function PasswordForm({ action, submitLabel, mode = 'reset' }: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null);
  const [password, setPassword] = useState('');
  const strength = passwordStrength(password);
  return (
    <form action={formAction} className="mt-6 max-w-sm space-y-4" noValidate>
      <input type="hidden" name="mode" value={mode} />
      <div className="space-y-1">
        <Label htmlFor="password">Nouveau mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby="password-aide password-force"
          aria-invalid={state?.fieldErrors?.password ? true : undefined}
        />
        <p id="password-aide" className="text-muted-foreground text-xs">
          {PASSWORD_MIN_LENGTH} caractères minimum. Une phrase de passe est idéale.
        </p>
        <div className="flex items-center gap-2" id="password-force" aria-live="polite">
          <meter min={0} max={4} low={2} high={3} optimum={4} value={strength.score} className="h-2 w-32" aria-label="Robustesse du mot de passe" />
          <span className="text-sm">Robustesse : {password ? strength.label : '—'}</span>
        </div>
        {state?.fieldErrors?.password ? (
          <p role="alert" className="text-destructive text-sm">
            {state.fieldErrors.password}
          </p>
        ) : null}
      </div>
      <div className="space-y-1">
        <Label htmlFor="confirm">Confirmez le mot de passe</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" aria-invalid={state?.fieldErrors?.confirm ? true : undefined} />
        {state?.fieldErrors?.confirm ? (
          <p role="alert" className="text-destructive text-sm">
            {state.fieldErrors.confirm}
          </p>
        ) : null}
      </div>
      {state?.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
      {state?.message ? (
        <p role="status" className="text-sm text-green-800">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
