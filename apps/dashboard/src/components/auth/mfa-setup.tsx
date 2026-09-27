'use client';

import { useEffect, useState, useTransition } from 'react';

import type { Enrollment } from '@/app/actions/auth';
import { confirmEnrollmentAction, startEnrollmentAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Ajout d'un appareil TOTP : QR code et cle en texte (lecteurs d'ecran), puis verification. */
export function MfaSetup({ next, secondDevice = false }: { next: string; secondDevice?: boolean }) {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    void startEnrollmentAction().then((e) => {
      if (active) setEnrollment(e);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!enrollment) return <p className="mt-6" aria-live="polite">Préparation…</p>;
  if ('error' in enrollment) return <p role="alert" className="text-destructive mt-6">{enrollment.error}</p>;
  const { factorId, qrCode, secret } = enrollment;

  return (
    <div className="mt-6 space-y-5">
      <ol className="list-inside list-decimal space-y-4">
        <li>
          Scannez ce QR code avec votre application :
          {/* eslint-disable-next-line @next/next/no-img-element -- QR code SVG fourni par Supabase Auth */}
          <img src={qrCode} alt="QR code d’ajout du compte dans l’application d’authentification" className="mt-2 size-44 rounded border bg-white p-2" />
        </li>
        <li>
          Ou saisissez la clé à la main :
          <code data-testid="totp-secret" className="bg-muted mt-1 block rounded p-2 font-mono text-sm break-all">
            {secret}
          </code>
        </li>
        <li>
          <form
            className="mt-1 inline-flex flex-wrap items-end gap-2"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              startTransition(async () => {
                const result = await confirmEnrollmentAction(factorId, code, next);
                if (result?.error) setError(result.error);
              });
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="enroll-code">Code affiché par l’application</Label>
              <Input
                id="enroll-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className="w-40 font-mono"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'enroll-erreur' : undefined}
              />
            </div>
            <Button type="submit" disabled={pending}>
              Activer
            </Button>
          </form>
          {error ? (
            <p id="enroll-erreur" role="alert" className="text-destructive mt-2 text-sm">
              {error}
            </p>
          ) : null}
        </li>
      </ol>
      {secondDevice ? null : (
        <p className="rounded-md border border-blue-300 bg-blue-50 p-3 text-sm text-blue-950">
          Conseil : ajoutez ensuite un second appareil de secours (page « Sécurité du compte ») pour ne pas perdre l’accès si vous changez de
          téléphone.
        </p>
      )}
    </div>
  );
}
