import 'server-only';

import type { DataContext } from '@app/data';

import { getRepos } from '@/server/repos';

/** Donnees communes aux pages de creation et d'edition d'une actualite. */
export async function loadPostEditorData(ctx: DataContext) {
  const repos = getRepos();
  const [districts, topics, branding] = await Promise.all([
    repos.districts.list(ctx),
    repos.topics.list(ctx),
    repos.branding.get(ctx),
  ]);
  return {
    districts: districts.map((d) => ({ id: d.id, name: d.name })),
    topics: topics.map((t) => ({ id: t.id, label: t.label })),
    branding: { appName: branding.appName, colors: branding.colors },
  };
}
