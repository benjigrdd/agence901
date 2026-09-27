import { PERSONA_KEYS, PERSONAS } from '@app/data';
import { ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';

import { setMemberPersona, setPersona } from '@/app/actions/session';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getProductName } from '@/lib/product-name';

import { LoginForm } from './login-form';
import { isMockDataSource } from '@/server/repos';
import { invitedMembers } from '@/server/session';

export const metadata: Metadata = { title: 'Connexion' };

export default async function LoginPage({ searchParams }: PageProps<'/connexion'>) {
  const { erreur, next } = await searchParams;
  const staff = PERSONA_KEYS.map((key) => PERSONAS[key]).filter((p) => p.kind === 'staff');

  return (
    <main id="contenu" className="mx-auto w-full max-w-4xl flex-1 p-6 sm:p-10">
      <h1 className="text-3xl font-semibold tracking-tight">Connexion à {getProductName()}</h1>
      {erreur === 'lien' ? (
        <p role="alert" className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
          Ce lien n’est plus valide. Recommencez la procédure.
        </p>
      ) : null}
      {erreur === '2fa' ? (
        <div role="alert" className="mt-6 flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Double authentification requise</p>
            <p className="text-sm">Validez votre second facteur pour accéder à l’espace de gestion.</p>
          </div>
        </div>
      ) : null}

      {isMockDataSource() ? (
        <>
          <p className="text-muted-foreground mt-2">
            Mode démonstration : choisissez une persona. Les données sont fictives.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {staff.map((persona) => (
              <li key={persona.key}>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>
                      <h2>{persona.label}</h2>
                    </CardTitle>
                    <CardDescription>{persona.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    {persona.aal === 'aal1' ? (
                      <p className="text-muted-foreground mb-3 text-sm">Double authentification non validée.</p>
                    ) : null}
                    <form action={setPersona}>
                      <input type="hidden" name="persona" value={persona.key} />
                      <Button type="submit" className="w-full">
                        Se connecter en tant que {persona.label}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          {invitedMembers().length ? (
            <section aria-labelledby="membres-invites" className="mt-8 space-y-3">
              <h2 id="membres-invites" className="text-lg font-semibold">
                Membres invités pendant la démonstration
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {invitedMembers().map((m) => (
                  <li key={m.userId}>
                    <form action={setMemberPersona} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                      <span className="font-medium">{m.displayName}</span>
                      <input type="hidden" name="userId" value={m.userId} />
                      <Button type="submit" variant="outline">
                        Se connecter en tant que {m.displayName}
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : (
        <LoginForm next={typeof next === 'string' && next.startsWith('/') ? next : '/'} />
      )}
    </main>
  );
}
