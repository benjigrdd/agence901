import type { Metadata } from 'next';

import { ModulePlaceholder } from '@/components/shell/module-placeholder';
import { requirePermission } from '@/server/guards';

export const metadata: Metadata = { title: "Commune" };

export default async function Page({ params }: PageProps<'/[tenant]/parametres/commune'>) {
  const { tenant } = await params;
  await requirePermission(tenant, 'settings', 'read');
  return <ModulePlaceholder title="Commune" description="Informations de la commune, liens légaux et accueil de l’application." lot="06" />;
}
