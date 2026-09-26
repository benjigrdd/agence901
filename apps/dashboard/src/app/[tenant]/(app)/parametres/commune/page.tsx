import { can, formatNumberFr, TENANT_TYPE_LABELS } from '@app/shared';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/page-header';
import { requirePermission } from '@/server/guards';
import { getRepos } from '@/server/repos';

import { AppSettingsForm } from './app-settings-form';

export const metadata: Metadata = { title: 'Commune' };

export default async function TenantSettingsPage({ params }: PageProps<'/[tenant]/parametres/commune'>) {
  const { tenant: slug } = await params;
  const { session, tenant, ctx } = await requirePermission(slug, 'settings', 'read');
  const repos = getRepos();
  const [branding, config] = await Promise.all([repos.branding.get(ctx), repos.appConfig.get(ctx)]);
  const info: [string, string][] = [
    ['Nom', tenant.name],
    ['Type', TENANT_TYPE_LABELS[tenant.type]],
    ['Code INSEE', tenant.inseeCode],
    ['Population', formatNumberFr(tenant.population)],
    ['Nom de l’application', branding.appName],
    ['Nom court', branding.shortName],
  ];
  return (
    <>
      <PageHeader title="Commune" description="Informations et marque (gérées par l’éditeur), liens légaux et accueil de l’application." />
      <section aria-labelledby="infos-commune" className="mb-10 space-y-3">
        <h2 id="infos-commune" className="text-lg font-semibold">
          Informations et marque
        </h2>
        <p className="text-muted-foreground text-sm">En lecture seule : contactez l’éditeur pour les modifier.</p>
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          {info.map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="text-muted-foreground">{k} :</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <ul className="flex flex-wrap gap-3" aria-label="Couleurs de la marque">
          {Object.entries(branding.colors).map(([name, color]) => (
            <li key={name} className="flex items-center gap-2 text-sm">
              <span className="size-6 rounded border" style={{ backgroundColor: color }} aria-hidden="true" />
              {name} : <code>{color}</code>
            </li>
          ))}
        </ul>
      </section>
      <AppSettingsForm
        slug={slug}
        canEdit={can(session, tenant.id, 'settings', 'edit')}
        links={config.links}
        homeLayout={config.homeLayout}
        branding={{ appName: branding.appName, primary: branding.colors.primary, onPrimary: branding.colors.onPrimary, background: branding.colors.background, text: branding.colors.text }}
      />
    </>
  );
}
