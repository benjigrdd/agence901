import { can } from '@app/shared';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/page-header';
import { requirePermission } from '@/server/guards';
import { getRepos } from '@/server/repos';

import { ContactForm } from './contact-form';
import { ProceduresManager } from './procedures-manager';

export const metadata: Metadata = { title: 'Démarches' };

export default async function ProceduresPage({ params }: PageProps<'/[tenant]/demarches'>) {
  const { tenant: slug } = await params;
  const { session, tenant, ctx } = await requirePermission(slug, 'procedures', 'read');
  const repos = getRepos();
  const [procedures, config] = await Promise.all([repos.procedures.list(ctx), repos.appConfig.get(ctx)]);
  // Remonte l'etat local quand le contenu change (ajout, modification), pas pour un simple reordonnancement :
  // le focus clavier reste sur la poignee deplacee.
  const version = procedures
    .map((p) => `${p.id}:${p.category}:${p.title}:${p.description}:${p.kind}:${p.value}`)
    .sort()
    .join('|');
  return (
    <>
      <PageHeader title="Démarches" description="Les démarches et contacts proposés dans l’application." />
      <div className="grid gap-10">
        <ProceduresManager
          key={version}
          slug={slug}
          canEdit={can(session, tenant.id, 'procedures', 'edit')}
          procedures={procedures
            .sort((a, b) => a.order - b.order)
            .map(({ id, category, title, description, kind, value, order }) => ({ id, category, title, description, kind, value, order }))}
        />
        <ContactForm slug={slug} canEdit={can(session, tenant.id, 'settings', 'edit')} initial={config.contact} />
      </div>
    </>
  );
}
