import 'server-only';

import type { DataContext } from '@app/data';

import { getRepos } from '@/server/repos';

export async function loadEventEditorData(ctx: DataContext) {
  const repos = getRepos();
  const [feed, branding, tenant] = await Promise.all([repos.citizen.publicFeed(ctx), repos.branding.get(ctx), repos.tenants.get(ctx)]);
  return {
    // Lieux publies de la carte : lisibles meme sans droit sur le module Carte.
    places: feed.places.map((p) => ({ id: p.id, name: p.name })).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    center: tenant.center,
    branding: { appName: branding.appName, colors: branding.colors },
  };
}
