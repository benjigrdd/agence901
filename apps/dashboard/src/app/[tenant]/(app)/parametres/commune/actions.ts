'use server';

import { ValidationError } from '@app/data';
import type { AppLinks, HomeLayoutItem } from '@app/shared';
import { AppLinksSchema, HomeLayoutSchema } from '@app/shared';
import { revalidatePath } from 'next/cache';

import type { ActionResult } from '@/server/errors';
import { runAction, toActionError } from '@/server/errors';
import { requireTenant } from '@/server/guards';
import { getRepos } from '@/server/repos';

export async function saveAppSettingsAction(slug: string, links: AppLinks, homeLayout: HomeLayoutItem[]): Promise<ActionResult<null>> {
  const parsedLinks = AppLinksSchema.safeParse(links);
  if (!parsedLinks.success) return toActionError(ValidationError.fromZod(parsedLinks.error));
  const parsedLayout = HomeLayoutSchema.safeParse(homeLayout);
  if (!parsedLayout.success) return toActionError(ValidationError.fromZod(parsedLayout.error));
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    const repo = getRepos().appConfig;
    const { contact } = await repo.get(ctx);
    await repo.update(ctx, { contact, links: parsedLinks.data, homeLayout: parsedLayout.data });
    revalidatePath(`/${slug}/parametres/commune`);
    return null;
  });
}
