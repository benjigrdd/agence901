import { redirect } from 'next/navigation';

import { getRepos } from '@/server/repos';
import { getSession } from '@/server/session';

/** Aiguillage : super-admin -> /admin ; une commune -> /{slug} ; plusieurs -> choix. */
export default async function RootPage() {
  const session = await getSession();
  if (!session) redirect('/connexion');
  if (session.aal !== 'aal2') redirect('/connexion?erreur=2fa');
  if (session.isPlatformAdmin) redirect('/admin');
  const { items } = await getRepos().tenants.list({ session });
  const [only] = items;
  if (items.length === 1 && only) redirect(`/${only.slug}`);
  redirect('/choisir-commune');
}
