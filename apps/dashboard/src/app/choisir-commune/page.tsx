import { Building2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { EmptyState } from '@/components/empty-state';
import { requireSession } from '@/server/guards';
import { getRepos } from '@/server/repos';

export const metadata: Metadata = { title: 'Choisir une commune' };

export default async function ChooseTenantPage() {
  const session = await requireSession();
  const { items } = await getRepos().tenants.list({ session });

  return (
    <main id="contenu" className="mx-auto w-full max-w-2xl flex-1 p-6 sm:p-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Choisir une commune</h1>
      {items.length === 0 ? (
        <EmptyState title="Aucune commune" description="Votre compte n’est rattaché à aucune commune." />
      ) : (
        <ul className="divide-y rounded-md border">
          {items.map((tenant) => (
            <li key={tenant.id}>
              <Link href={`/${tenant.slug}`} className="hover:bg-muted flex items-center gap-3 p-4 font-medium">
                <Building2 className="size-5" aria-hidden="true" />
                {tenant.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
